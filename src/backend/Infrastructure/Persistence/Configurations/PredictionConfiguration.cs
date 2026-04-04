using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class PredictionConfiguration : IEntityTypeConfiguration<Prediction>
{
    public void Configure(EntityTypeBuilder<Prediction> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Horizon).IsRequired().HasMaxLength(5);
        builder.Property(p => p.Signal).IsRequired().HasMaxLength(20);
        builder.Property(p => p.ProbabilitiesJson).IsRequired().HasColumnType("text");
        builder.HasIndex(p => new { p.StockId, p.Horizon, p.ExpiresAt });
        builder.HasOne(p => p.Stock)
               .WithMany(s => s.Predictions)
               .HasForeignKey(p => p.StockId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
