using System;
using UnityEngine;

namespace GameLearning.HollowKnight;

/// <summary>Unity APIs may only be called on the main thread; effects from the hub are applied here.</summary>
internal sealed class MainThreadPump : MonoBehaviour
{
    private HubConnection? _hub;
    private Action<string>? _log;

    public void Init(HubConnection hub, Action<string> log)
    {
        _hub = hub;
        _log = log;
    }

    private void Update()
    {
        if (_hub == null) return;
        while (_hub.TryDequeueEffect(out var effect))
        {
            string? problem;
            try
            {
                problem = Effects.Apply(effect.Name, effect.Params);
            }
            catch (Exception e)
            {
                problem = e.Message;
            }
            _log?.Invoke(problem == null ? $"Applied {effect.Name}" : $"Could not apply {effect.Name}: {problem}");
            _hub.SendEffectResult(effect.Id, problem == null ? "applied" : "failed", problem);
        }
    }
}
