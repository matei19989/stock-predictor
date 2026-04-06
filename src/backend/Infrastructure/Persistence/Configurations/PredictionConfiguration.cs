using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class PredictionConfiguration : IEntityTypeConfiguration<Prediction>
{
    public void Configure(EntityTypeBuilder<Prediction> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Horizon)
               .IsRequired()
               .HasMaxLength(5)
               .HasConversion(
                   h => h.ToWireString(),
                   s => HorizonExtensions.ParseHorizon(s));

        builder.Property(p => p.Signal)
               .IsRequired()
               .HasMaxLength(20)
               .HasConversion(
                   sig => sig.ToWireString(),
                   s => TradingSignalExtensions.ParseTradingSignal(s));

        builder.Property(p => p.Probabilities)
               .IsRequired()
               .HasColumnType("text")
               .HasColumnName("ProbabilitiesJson")
               .HasConversion(
                   dict => JsonSerializer.Serialize(dict, JsonSerializerOptions.Default),
                   json => JsonSerializer.Deserialize<Dictionary<string, double>>(json, JsonSerializerOptions.Default)!);

        builder.HasIndex(p => new { p.StockId, p.Horizon, p.ExpiresAt });
        builder.HasOne(p => p.Stock)
               .WithMany(s => s.Predictions)
               .HasForeignKey(p => p.StockId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
