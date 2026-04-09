import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, ChartLine, Star, Newspaper, ArrowRight } from '@phosphor-icons/react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function LandingPage() {
  useDocumentTitle('');
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex min-h-[65vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Smart Stock Predictions,{' '}
          <span className="text-primary">Powered by Machine Learning</span>
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          XGBoost-powered trading signals — Strong Sell to Strong Buy — built from
          22 technical indicators and global news sentiment from 66M+ articles.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link to="/register">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/40 py-16 px-4">
        <h2 className="mb-8 text-center text-2xl font-bold">Why StockPredictor?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <Brain size={32} className="text-primary mb-3" />
              <h3 className="mb-1 font-semibold">ML-Powered Signals</h3>
              <p className="text-sm text-muted-foreground">
                XGBoost model analyzes 22 technical and sentiment features to classify each stock's outlook.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <ChartLine size={32} className="text-primary mb-3" />
              <h3 className="mb-1 font-semibold">Real-Time Data</h3>
              <p className="text-sm text-muted-foreground">
                Stock prices fetched hourly from global markets via yfinance. Always fresh, always fast.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Star size={32} className="text-primary mb-3" />
              <h3 className="mb-1 font-semibold">Watchlist Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track any S&P 500 stock. See price, daily change, and ML signal at a glance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Newspaper size={32} className="text-primary mb-3" />
              <h3 className="mb-1 font-semibold">Sentiment Analysis</h3>
              <p className="text-sm text-muted-foreground">
                GDELT global news — 66M+ articles analyzed. Coverage for 84% of S&P 500 stocks.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">How It Works</h2>
        <div className="flex items-center justify-center gap-4 text-sm">
          {['Search for a stock', 'Request a prediction', 'Read the signal'].map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {i + 1}
                </div>
                <span className="text-muted-foreground">{step}</span>
              </div>
              {i < 2 && <ArrowRight className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        StockPredictor &middot; Bachelor&apos;s Thesis Project
      </footer>
    </div>
  );
}
