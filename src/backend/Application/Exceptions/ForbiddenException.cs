namespace StockPredictor.Application.Exceptions;

public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "Forbidden.") : base(message, 403) { }
}
