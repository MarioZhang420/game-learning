using Modding;
using UnityEngine;

namespace GameLearning.HollowKnight;

/// <summary>
/// Reports Hollow Knight events to the Game Learning hub and applies the rewards it sends back.
/// All game-specific code lives here; the hub only sees standard protocol names.
/// </summary>
public sealed class GameLearningMod : Mod
{
    internal static GameLearningMod? Instance { get; private set; }

    private HubConnection? _hub;

    public GameLearningMod() : base("Game Learning") { }

    public override string GetVersion() => typeof(GameLearningMod).Assembly.GetName().Version.ToString(3);

    public override void Initialize()
    {
        Instance = this;
        _hub = new HubConnection(
            effects: new[] { Effects.CurrencyGrant, Effects.HealthRestore },
            events: new[] { "player.died", "player.rested" },
            log: Log,
            version: GetVersion());

        ModHooks.AfterPlayerDeadHook += OnPlayerDied;
        ModHooks.SetPlayerBoolHook += OnSetPlayerBool;

        var runner = new GameObject("GameLearning.MainThread");
        Object.DontDestroyOnLoad(runner);
        runner.AddComponent<MainThreadPump>().Init(_hub, Log);

        _hub.Start();
        Log("Game Learning loaded; looking for the hub.");
    }

    private void OnPlayerDied() => _hub?.SendEvent("player.died");

    private bool OnSetPlayerBool(string name, bool value)
    {
        // "atBench" turns true when the Knight sits on a bench.
        if (name == "atBench" && value && !PlayerData.instance.GetBool("atBench"))
        {
            _hub?.SendEvent("player.rested");
        }
        return value;
    }
}
