using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace GameLearning.HollowKnight;

internal readonly struct PendingEffect
{
    public PendingEffect(string id, string name, JObject @params)
    {
        Id = id;
        Name = name;
        Params = @params;
    }

    public string Id { get; }
    public string Name { get; }
    public JObject Params { get; }
}

/// <summary>
/// Talks to the hub with the Game Learning protocol v1 (JSON over WebSocket on 127.0.0.1).
/// Finds the hub through its discovery file, reconnects on its own, and never blocks the game thread.
/// </summary>
internal sealed class HubConnection
{
    private const string Protocol = "1";
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

    private readonly string[] _effects;
    private readonly string[] _events;
    private readonly Action<string> _log;
    private readonly string _version;
    private readonly BlockingCollection<string> _outbox = new(new ConcurrentQueue<string>(), 256);
    private readonly ConcurrentQueue<PendingEffect> _effectsInbox = new();
    private volatile bool _connected;

    public HubConnection(string[] effects, string[] events, Action<string> log, string version)
    {
        _effects = effects;
        _events = events;
        _log = log;
        _version = version;
    }

    public void Start() => Task.Run(RunAsync);

    public void SendEvent(string name, JObject? data = null)
    {
        if (!_connected) return; // Events while the hub is away are dropped on purpose: they are moments, not data.
        var message = new JObject
        {
            ["type"] = "event",
            ["id"] = Guid.NewGuid().ToString(),
            ["name"] = name,
            ["at"] = DateTime.UtcNow.ToString("o"),
        };
        if (data != null) message["data"] = data;
        _outbox.TryAdd(message.ToString(Newtonsoft.Json.Formatting.None));
    }

    public void SendEffectResult(string effectId, string status, string? message)
    {
        var json = new JObject { ["type"] = "effect.result", ["effectId"] = effectId, ["status"] = status };
        if (message != null) json["message"] = message;
        _outbox.TryAdd(json.ToString(Newtonsoft.Json.Formatting.None));
    }

    public bool TryDequeueEffect(out PendingEffect effect) => _effectsInbox.TryDequeue(out effect);

    private async Task RunAsync()
    {
        var lastProblem = "";
        while (true)
        {
            try
            {
                await ConnectOnceAsync();
                lastProblem = "";
            }
            catch (Exception e)
            {
                // Log each distinct problem once, not every 5 seconds.
                if (e.Message != lastProblem) _log($"Hub not reachable: {e.Message}");
                lastProblem = e.Message;
            }
            _connected = false;
            await Task.Delay(RetryDelay);
        }
    }

    private async Task ConnectOnceAsync()
    {
        var discovery = ReadDiscovery();
        using var socket = new ClientWebSocket();
        using var cancel = new CancellationTokenSource();
        await socket.ConnectAsync(new Uri($"ws://127.0.0.1:{discovery.Port}/"), cancel.Token);

        await SendAsync(socket, new JObject
        {
            ["type"] = "hello",
            ["protocol"] = Protocol,
            ["role"] = "game",
            ["token"] = discovery.Token,
            ["integration"] = new JObject { ["id"] = "hollow-knight", ["name"] = "Hollow Knight mod", ["version"] = _version },
            ["game"] = new JObject { ["id"] = "hollow-knight", ["name"] = "Hollow Knight" },
            ["capabilities"] = new JObject { ["events"] = new JArray(_events), ["effects"] = new JArray(_effects) },
        }.ToString(Newtonsoft.Json.Formatting.None), cancel.Token);

        var welcome = JObject.Parse(await ReceiveAsync(socket, cancel.Token));
        if ((string?)welcome["type"] != "welcome")
        {
            throw new InvalidOperationException($"hub refused: {welcome["message"]}");
        }
        _log("Connected to the Game Learning hub.");
        _connected = true;

        var sender = Task.Run(async () =>
        {
            while (!cancel.IsCancellationRequested && socket.State == WebSocketState.Open)
            {
                if (_outbox.TryTake(out var text, 250)) await SendAsync(socket, text, cancel.Token);
            }
        });

        try
        {
            while (socket.State == WebSocketState.Open)
            {
                var message = JObject.Parse(await ReceiveAsync(socket, cancel.Token));
                switch ((string?)message["type"])
                {
                    case "effect":
                        _effectsInbox.Enqueue(new PendingEffect(
                            (string)message["id"]!,
                            (string)message["name"]!,
                            message["params"] as JObject ?? new JObject()));
                        break;
                    case "error":
                        _log($"Hub error: {message["message"]}");
                        break;
                }
            }
        }
        finally
        {
            _connected = false;
            cancel.Cancel();
            try { await sender; } catch (OperationCanceledException) { }
            _log("Disconnected from the hub.");
        }
    }

    private static async Task SendAsync(ClientWebSocket socket, string text, CancellationToken token)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, token);
    }

    private static async Task<string> ReceiveAsync(ClientWebSocket socket, CancellationToken token)
    {
        var buffer = new byte[8192];
        using var stream = new MemoryStream();
        WebSocketReceiveResult result;
        do
        {
            result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
            if (result.MessageType == WebSocketMessageType.Close) throw new IOException("hub closed the connection");
            stream.Write(buffer, 0, result.Count);
        } while (!result.EndOfMessage);
        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static (int Port, string Token) ReadDiscovery()
    {
        var home = Environment.GetEnvironmentVariable("GAME_LEARNING_HOME");
        if (string.IsNullOrEmpty(home))
        {
            home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "game-learning");
        }
        var file = Path.Combine(home, "hub.json");
        if (!File.Exists(file)) throw new FileNotFoundException("the hub is not running (no hub.json)");
        var json = JObject.Parse(File.ReadAllText(file));
        return ((int)json["port"]!, (string)json["token"]!);
    }
}
