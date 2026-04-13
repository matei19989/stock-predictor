namespace StockPredictor.Application.Settings;

public class TurnstileSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string SiteVerifyUrl { get; set; } = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
}
