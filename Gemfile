source "https://rubygems.org"

# ── Local development ────────────────────────────────────────────
# Modern Jekyll + Liquid that work on Ruby 3.2+ (no `tainted?` bug).
# GitHub Pages builds with its own pinned versions on the server, so
# this only affects `bundle exec jekyll serve` on your machine.
gem "jekyll"
gem "jekyll-sass-converter"

gem "jekyll-seo-tag"
gem "jekyll-sitemap"
gem "jekyll-feed"

# Faraday retry shim (silences the warning, harmless if unused)
gem "faraday-retry"

# Windows / JRuby tz data
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
gem "wdm", "~> 0.1.1", platforms: [:mingw, :mswin, :x64_mingw]

# ── Production (GitHub Pages) ────────────────────────────────────
# GitHub Pages ignores your Gemfile and uses its own image. If you
# ever want to mirror their stack locally, comment out the `jekyll`
# line above and uncomment this one:
#
# gem "github-pages", group: :jekyll_plugins
