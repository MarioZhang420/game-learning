using System;
using Newtonsoft.Json.Linq;

namespace GameLearning.HollowKnight;

/// <summary>Maps standard protocol effects to Hollow Knight. Runs on Unity's main thread only.</summary>
internal static class Effects
{
    public const string CurrencyGrant = "currency.grant";
    public const string HealthRestore = "health.restore";

    /// <returns>null when applied, otherwise the reason it was not.</returns>
    public static string? Apply(string name, JObject parameters)
    {
        var hero = HeroController.instance;
        if (hero == null) return "The Knight is not in the world right now.";
        var amount = parameters.Value<int?>("amount") ?? 0;
        if (amount <= 0) return "amount must be a positive number.";

        switch (name)
        {
            case CurrencyGrant:
                hero.AddGeo(Math.Min(amount, 1000));
                return null;
            case HealthRestore:
                hero.AddHealth(Math.Min(amount, 3));
                return null;
            default:
                return $"Unknown effect '{name}'.";
        }
    }
}
