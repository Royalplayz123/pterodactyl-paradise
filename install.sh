#!/bin/bash
set -e

# ============================================
# 🚀 VPS Auto-Installer
# Installs Frontend + Edge Functions + Nginx + SSL
# Supports Ubuntu 20.04+ / Debian 11+
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════╗"
  echo "║     🚀 Dashboard VPS Auto-Installer      ║"
  echo "║     Frontend + Backend + SSL Setup        ║"
  echo "╚══════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_step() {
  echo -e "\n${GREEN}[✓] $1${NC}"
}

print_warn() {
  echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
  echo -e "${RED}[✗] $1${NC}"
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo bash install.sh"
    exit 1
  fi
}

# ============================================
# GATHER USER INPUT
# ============================================
gather_input() {
  print_banner

  echo -e "${CYAN}We need some information to set up your dashboard.${NC}\n"

  read -p "Enter your domain name (e.g., dashboard.example.com): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    print_error "Domain is required!"
    exit 1
  fi

  read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
  if [ -z "$SUPABASE_URL" ]; then
    print_error "Supabase URL is required!"
    exit 1
  fi

  read -p "Enter your Supabase Anon/Publishable Key: " SUPABASE_ANON_KEY
  if [ -z "$SUPABASE_ANON_KEY" ]; then
    print_error "Supabase Anon Key is required!"
    exit 1
  fi

  read -p "Enter your Supabase Service Role Key (for edge functions): " SUPABASE_SERVICE_KEY
  if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    print_error "Service Role Key is required!"
    exit 1
  fi

  # Extract project ref from URL
  SUPABASE_PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

  echo ""
  print_warn "Optional secrets (press Enter to skip):"
  read -p "  PTERODACTYL_PANEL_URL: " PTERODACTYL_PANEL_URL
  read -p "  PTERODACTYL_API_KEY: " PTERODACTYL_API_KEY
  read -p "  DISCORD_CLIENT_ID: " DISCORD_CLIENT_ID
  read -p "  DISCORD_CLIENT_SECRET: " DISCORD_CLIENT_SECRET
  read -p "  DISCORD_BOT_TOKEN: " DISCORD_BOT_TOKEN
  read -p "  DISCORD_SERVER_ID: " DISCORD_SERVER_ID

  read -p "Set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
  if [ "$SETUP_SSL" = "y" ]; then
    read -p "Enter email for SSL certificate: " SSL_EMAIL
  fi

  echo ""
  echo -e "${CYAN}═══════════════ Summary ═══════════════${NC}"
  echo "  Domain:       $DOMAIN"
  echo "  Supabase URL: $SUPABASE_URL"
  echo "  Project Ref:  $SUPABASE_PROJECT_REF"
  echo "  SSL:          $SETUP_SSL"
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo ""
  read -p "Continue with installation? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    echo "Installation cancelled."
    exit 0
  fi
}

# ============================================
# INSTALL SYSTEM DEPENDENCIES
# ============================================
install_dependencies() {
  print_step "Updating system packages..."
  apt update -y && apt upgrade -y

  print_step "Installing Nginx, Curl, Git, Unzip..."
  apt install -y nginx curl git unzip software-properties-common

  # Install Node.js 20 LTS
  if ! command -v node &> /dev/null; then
    print_step "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  else
    print_step "Node.js already installed: $(node -v)"
  fi

  # Install Supabase CLI
  if ! command -v supabase &> /dev/null; then
    print_step "Installing Supabase CLI..."
    npm install -g supabase@latest
  else
    print_step "Supabase CLI already installed"
  fi

  # Install Certbot for SSL
  if [ "$SETUP_SSL" = "y" ]; then
    print_step "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
  fi
}

# ============================================
# BUILD FRONTEND
# ============================================
build_frontend() {
  print_step "Installing npm dependencies..."
  cd /opt/dashboard
  npm install

  print_step "Building frontend with your Supabase credentials..."
  VITE_SUPABASE_URL="$SUPABASE_URL" \
  VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY" \
  VITE_SUPABASE_PROJECT_ID="$SUPABASE_PROJECT_REF" \
  npm run build

  print_step "Frontend built successfully!"

  # Copy build to web root
  rm -rf /var/www/dashboard
  cp -r dist /var/www/dashboard
  chown -R www-data:www-data /var/www/dashboard
}

# ============================================
# DEPLOY EDGE FUNCTIONS
# ============================================
deploy_edge_functions() {
  print_step "Linking to Supabase project..."
  cd /opt/dashboard

  # Login with service role approach
  export SUPABASE_ACCESS_TOKEN=""

  print_warn "You need to create a Supabase access token."
  echo "  1. Go to: https://supabase.com/dashboard/account/tokens"
  echo "  2. Click 'Generate new token'"
  echo "  3. Copy and paste it below"
  echo ""
  read -p "Enter your Supabase Access Token: " SUPABASE_ACCESS_TOKEN
  export SUPABASE_ACCESS_TOKEN

  supabase link --project-ref "$SUPABASE_PROJECT_REF"

  print_step "Setting edge function secrets..."
  SECRETS_CMD="supabase secrets set"
  SECRETS_CMD="$SECRETS_CMD SUPABASE_URL=$SUPABASE_URL"
  SECRETS_CMD="$SECRETS_CMD SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
  SECRETS_CMD="$SECRETS_CMD SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY"
  SECRETS_CMD="$SECRETS_CMD SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY"
  SECRETS_CMD="$SECRETS_CMD SUPABASE_DB_URL=postgresql://postgres:postgres@db.$SUPABASE_PROJECT_REF.supabase.co:5432/postgres"

  [ -n "$PTERODACTYL_PANEL_URL" ] && SECRETS_CMD="$SECRETS_CMD PTERODACTYL_PANEL_URL=$PTERODACTYL_PANEL_URL"
  [ -n "$PTERODACTYL_API_KEY" ] && SECRETS_CMD="$SECRETS_CMD PTERODACTYL_API_KEY=$PTERODACTYL_API_KEY"
  [ -n "$DISCORD_CLIENT_ID" ] && SECRETS_CMD="$SECRETS_CMD DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID"
  [ -n "$DISCORD_CLIENT_SECRET" ] && SECRETS_CMD="$SECRETS_CMD DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET"
  [ -n "$DISCORD_BOT_TOKEN" ] && SECRETS_CMD="$SECRETS_CMD DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN"
  [ -n "$DISCORD_SERVER_ID" ] && SECRETS_CMD="$SECRETS_CMD DISCORD_SERVER_ID=$DISCORD_SERVER_ID"

  eval $SECRETS_CMD

  print_step "Deploying edge functions..."
  # Remove deno.lock if it exists (can cause deploy issues)
  rm -f supabase/functions/deno.lock deno.lock

  FUNCTIONS=("afk-claim" "discord-auth" "discord-link" "password-reset" "pterodactyl-api" "send-email")
  for func in "${FUNCTIONS[@]}"; do
    echo -e "  Deploying ${CYAN}$func${NC}..."
    supabase functions deploy "$func" --no-verify-jwt 2>/dev/null || \
    supabase functions deploy "$func" 2>/dev/null || \
    print_warn "Failed to deploy $func - you may need to deploy it manually"
  done

  print_step "Edge functions deployed!"
}

# ============================================
# CONFIGURE NGINX
# ============================================
configure_nginx() {
  print_step "Configuring Nginx..."

  cat > /etc/nginx/sites-available/dashboard <<NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    root /var/www/dashboard;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # SPA routing - all routes serve index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

  # Enable site
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard

  # Test and reload
  nginx -t
  systemctl restart nginx
  systemctl enable nginx

  print_step "Nginx configured and running!"
}

# ============================================
# SETUP SSL
# ============================================
setup_ssl() {
  if [ "$SETUP_SSL" = "y" ]; then
    print_step "Setting up SSL certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL"
    print_step "SSL certificate installed!"
  fi
}

# ============================================
# CREATE UPDATE SCRIPT
# ============================================
create_update_script() {
  print_step "Creating update script at /opt/dashboard/update.sh..."

  cat > /opt/dashboard/update.sh <<'UPDATE_SCRIPT'
#!/bin/bash
set -e
cd /opt/dashboard

echo "🔄 Pulling latest changes..."
git pull origin main 2>/dev/null || git pull origin master

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
source /opt/dashboard/.env.production
VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
VITE_SUPABASE_PROJECT_ID="$VITE_SUPABASE_PROJECT_ID" \
npm run build

echo "📂 Deploying to web root..."
rm -rf /var/www/dashboard
cp -r dist /var/www/dashboard
chown -R www-data:www-data /var/www/dashboard

echo "✅ Update complete!"
UPDATE_SCRIPT

  chmod +x /opt/dashboard/update.sh

  # Save env for future builds
  cat > /opt/dashboard/.env.production <<ENV_FILE
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_REF
ENV_FILE
}

# ============================================
# RUN DATABASE MIGRATIONS
# ============================================
run_migrations() {
  print_step "Running database migrations..."
  cd /opt/dashboard

  if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations 2>/dev/null)" ]; then
    supabase db push 2>/dev/null || print_warn "Migrations may already be applied or require manual review"
  else
    print_warn "No migrations found - skipping"
  fi
}

# ============================================
# SETUP STORAGE BUCKETS
# ============================================
setup_storage() {
  print_step "Setting up storage buckets..."
  cd /opt/dashboard

  # Create branding bucket (public)
  print_step "Creating 'branding' storage bucket..."
  supabase db execute --project-ref "$SUPABASE_PROJECT_REF" --sql "
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('branding', 'branding', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  " 2>/dev/null || print_warn "Branding bucket may already exist"

  # RLS: Allow public read access
  supabase db execute --project-ref "$SUPABASE_PROJECT_REF" --sql "
    DO \$\$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for branding' AND tablename = 'objects'
      ) THEN
        CREATE POLICY \"Public read access for branding\"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'branding');
      END IF;
    END
    \$\$;
  " 2>/dev/null || print_warn "Read policy may already exist"

  # RLS: Allow authenticated users to upload
  supabase db execute --project-ref "$SUPABASE_PROJECT_REF" --sql "
    DO \$\$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload branding' AND tablename = 'objects'
      ) THEN
        CREATE POLICY \"Authenticated users can upload branding\"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'branding');
      END IF;
    END
    \$\$;
  " 2>/dev/null || print_warn "Upload policy may already exist"

  # RLS: Allow authenticated users to update
  supabase db execute --project-ref "$SUPABASE_PROJECT_REF" --sql "
    DO \$\$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update branding' AND tablename = 'objects'
      ) THEN
        CREATE POLICY \"Authenticated users can update branding\"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'branding');
      END IF;
    END
    \$\$;
  " 2>/dev/null || print_warn "Update policy may already exist"

  # RLS: Allow authenticated users to delete
  supabase db execute --project-ref "$SUPABASE_PROJECT_REF" --sql "
    DO \$\$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete branding' AND tablename = 'objects'
      ) THEN
        CREATE POLICY \"Authenticated users can delete branding\"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'branding');
      END IF;
    END
    \$\$;
  " 2>/dev/null || print_warn "Delete policy may already exist"

  print_step "Storage buckets configured!"
}

# ============================================
# PRINT COMPLETION
# ============================================
print_complete() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║    ✅ Installation Complete!              ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  🌐 Your dashboard is live at:"
  if [ "$SETUP_SSL" = "y" ]; then
    echo -e "     ${CYAN}https://$DOMAIN${NC}"
  else
    echo -e "     ${CYAN}http://$DOMAIN${NC}"
  fi
  echo ""
  echo -e "  📂 Files:        /var/www/dashboard"
  echo -e "  📂 Project:      /opt/dashboard"
  echo -e "  🔄 Update:       sudo bash /opt/dashboard/update.sh"
  echo -e "  📋 Nginx logs:   /var/log/nginx/"
  echo ""
  echo -e "  ${YELLOW}⚠️  Make sure your domain DNS points to this server's IP!${NC}"
  echo ""
}

# ============================================
# MAIN
# ============================================
main() {
  check_root
  gather_input
  install_dependencies

  # Clone or use existing project
  if [ ! -d "/opt/dashboard" ]; then
    print_step "Cloning project..."
    read -p "Enter your GitHub repo URL: " REPO_URL
    git clone "$REPO_URL" /opt/dashboard
  else
    print_warn "/opt/dashboard already exists, using existing files"
    cd /opt/dashboard
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
  fi

  build_frontend
  configure_nginx
  deploy_edge_functions
  run_migrations
  setup_ssl
  create_update_script
  print_complete
}

main "$@"
