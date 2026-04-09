using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class StockConfiguration : IEntityTypeConfiguration<Stock>
{
    public void Configure(EntityTypeBuilder<Stock> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Ticker).IsRequired().HasMaxLength(10);
        builder.Property(s => s.Name).HasMaxLength(200);
        builder.Property(s => s.Sector).HasMaxLength(100);
        builder.HasIndex(s => s.Ticker).IsUnique();
    }
}
