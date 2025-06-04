ARG VARIANT=ubuntu-24.04
FROM mcr.microsoft.com/devcontainers/base:${VARIANT}

LABEL dev.containers.features="typescript"

WORKDIR /home/vscode

COPY post_create.sh chezmoi.toml /usr/src/
RUN chmod +x /usr/src/post_create.sh

# Install base tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    ranger curl tmux direnv neovim \
    && apt-get clean

# Install Node.js without npm
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable

# Install and activate latest pnpm
RUN corepack prepare pnpm@latest --activate

# Add pnpm's global bin directory to PATH
ENV PATH="/home/vscode/.local/share/pnpm:$PATH"

COPY package*.json ./
RUN pnpm install

# Add local node_modules/.bin to PATH (lower precedence than global pnpm)
ENV PATH="/home/vscode/node_modules/.bin:$PATH"