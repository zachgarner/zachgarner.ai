FROM ghost:5-alpine

# Stage custom theme where it won't be overwritten by volume
COPY zachgarner-theme /tmp/zachgarner-theme

# Create entrypoint wrapper that copies theme before Ghost starts
RUN printf '#!/bin/sh\n\
# Copy custom theme into the content volume on every boot\n\
mkdir -p /var/lib/ghost/content/themes/zachgarner-theme\n\
cp -r /tmp/zachgarner-theme/* /var/lib/ghost/content/themes/zachgarner-theme/\n\
echo "zachgarner-theme synced"\n\
# Run the original Ghost entrypoint\n\
exec docker-entrypoint.sh "$@"\n' > /usr/local/bin/custom-entrypoint.sh \
 && chmod +x /usr/local/bin/custom-entrypoint.sh

# Set active theme in config
RUN set -ex \
 && cd /var/lib/ghost \
 && node -e " \
    const fs = require('fs'); \
    const cfg = JSON.parse(fs.readFileSync('config.production.json','utf8')); \
    cfg.activeTheme = 'zachgarner-theme'; \
    cfg.mail = { transport: 'Direct', options: {} }; \
    cfg.logging = { transports: ['stdout'] }; \
    fs.writeFileSync('config.production.json', JSON.stringify(cfg, null, 2)); \
  "

ENTRYPOINT ["custom-entrypoint.sh"]
CMD ["node", "current/index.js"]
