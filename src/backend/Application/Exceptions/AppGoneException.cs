namespace StockPredictor.Application.Exceptions;

public class AppGoneException : AppException
{
    public AppGoneException(string message = "Resource is no longer available.") : base(message, 410) { }
}
