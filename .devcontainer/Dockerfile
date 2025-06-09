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

# Switch to vscode user and setup pnpm global directories
USER vscode
ENV PNPM_HOME="/home/vscode/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p $PNPM_HOME

# Install global dev tools with pnpm
RUN pnpm add -g \
    prettier@^3.5.3 \
    typescript@^5.8.3
