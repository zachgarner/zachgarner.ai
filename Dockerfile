FROM ghost:5-alpine

# Copy custom theme into Ghost's themes directory
COPY zachgarner-theme /var/lib/ghost/content.orig/themes/zachgarner-theme

# Set the active theme via config
RUN set -ex \
 && cd /var/lib/ghost \
 && node -e " \
    const fs = require('fs'); \
    const cfg = JSON.parse(fs.readFileSync('config.production.json','utf8')); \
    cfg.activeTheme = 'zachgarner-theme'; \
    fs.writeFileSync('config.production.json', JSON.stringify(cfg, null, 2)); \
    console.log('Set activeTheme to zachgarner-theme'); \
  "
