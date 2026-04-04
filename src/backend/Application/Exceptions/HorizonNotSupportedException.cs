namespace StockPredictor.Application.Exceptions;

public class HorizonNotSupportedException : AppException
{
    public HorizonNotSupportedException(string horizon)
        : base($"No trained model available for the '{horizon}' horizon.", 501) { }
}
