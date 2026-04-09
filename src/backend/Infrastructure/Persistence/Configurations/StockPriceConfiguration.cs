using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class StockPriceConfiguration : IEntityTypeConfiguration<StockPrice>
{
    public void Configure(EntityTypeBuilder<StockPrice> builder)
    {
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => new { p.StockId, p.Date }).IsUnique();
        builder.HasOne(p => p.Stock)
               .WithMany(s => s.Prices)
               .HasForeignKey(p => p.StockId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
