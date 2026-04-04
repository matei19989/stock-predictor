namespace StockPredictor.Application.Exceptions;

public class MlServiceUnavailableException : AppException
{
    public MlServiceUnavailableException(string message = "ML prediction service is temporarily unavailable.")
        : base(message, 503) { }
}
