using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class WatchlistItemConfiguration : IEntityTypeConfiguration<WatchlistItem>
{
    public void Configure(EntityTypeBuilder<WatchlistItem> builder)
    {
        builder.HasKey(w => w.Id);
        builder.HasIndex(w => new { w.UserId, w.StockId }).IsUnique();
        builder.HasOne(w => w.User)
               .WithMany(u => u.WatchlistItems)
               .HasForeignKey(w => w.UserId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(w => w.Stock)
               .WithMany(s => s.WatchlistItems)
               .HasForeignKey(w => w.StockId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
