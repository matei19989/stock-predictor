using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class StockVisitConfiguration : IEntityTypeConfiguration<StockVisit>
{
    public void Configure(EntityTypeBuilder<StockVisit> builder)
    {
        builder.HasKey(v => v.Id);
        builder.HasIndex(v => new { v.UserId, v.StockId }).IsUnique();
        builder.HasOne(v => v.User)
               .WithMany(u => u.StockVisits)
               .HasForeignKey(v => v.UserId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(v => v.Stock)
               .WithMany(s => s.StockVisits)
               .HasForeignKey(v => v.StockId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
