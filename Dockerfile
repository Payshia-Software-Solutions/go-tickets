# ========================================================
# Stage 1: Build Next.js Client
# ========================================================
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
COPY client/prisma ./prisma/

RUN npm install

COPY client/ .

ARG NEXT_PUBLIC_API_BASE_URL=https://gotickets.nebulync.com/server
ARG NEXT_PUBLIC_SITE_URL=https://gotickets.nebulync.com
ARG NEXT_PUBLIC_FACEBOOK_PIXEL_ID=724454870504742
ARG NEXT_PUBLIC_GA_ID=G-XW1Q7R19PV

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_FACEBOOK_PIXEL_ID=$NEXT_PUBLIC_FACEBOOK_PIXEL_ID
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build
RUN npm prune --production

# ========================================================
# Stage 2: Final All-in-One Container (Nginx + PHP-FPM + Node.js Next.js)
# ========================================================
FROM php:8.2-fpm-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Install System Utilities, Web Server & Libraries
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    gnupg \
    ca-certificates \
    zip \
    unzip \
    git \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x for Next.js runtime
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        gd \
        zip \
        mbstring \
        bcmath

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure PHP settings (uploads and memory)
RUN echo "upload_max_filesize = 64M" > /usr/local/etc/php/conf.d/gotickets.ini \
    && echo "post_max_size = 64M" >> /usr/local/etc/php/conf.d/gotickets.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/gotickets.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/gotickets.ini \
    && echo "clear_env = no" >> /usr/local/etc/php-fpm.d/www.conf

# Setup Directories
WORKDIR /var/www

# Copy Server (PHP Backend)
COPY server /var/www/server
RUN cd /var/www/server && if [ -f composer.json ]; then composer install --no-dev --optimize-autoloader; fi

# Copy Built Client (Next.js Frontend) from builder
COPY --from=client-builder /app/client /var/www/client

# Copy Nginx and Supervisor Configs
RUN rm -rf /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* /etc/nginx/conf.d/*
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Configure Permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www \
    && chmod -R 777 /var/www/server/uploads 2>/dev/null || true

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
