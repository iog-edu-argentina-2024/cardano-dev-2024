ARG UBUNTU_VERSION=24.04

# SYSTEM DEPENDENCIES
FROM ubuntu:${UBUNTU_VERSION} as system_deps
ENV DEBIAN_FRONTEND=nonintercative
RUN mkdir -p /app/src
WORKDIR /app
RUN apt-get update -y && apt-get install -y \
  curl \
  build-essential \
  git \
  libssl-dev \
  pkg-config \
  tmux \
  wget \
  && rm -rf /var/lib/apt/lists/*

# NODEJS
FROM system_deps as nodejs
ENV NODE_VERSION=16.13.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN echo "NodeJS installed"
RUN node --version
RUN npm --version

# RUST TOOLCHAIN
FROM nodejs as cargo
RUN curl https://sh.rustup.rs -sSfo rustup-init
RUN chmod +x rustup-init
RUN ./rustup-init -y
ENV PATH="/root/.cargo/bin:$PATH"

# AIKEN FROM SOURCE
FROM cargo as aiken
ARG AIKEN_VERSION=1.0.29-alpha
RUN cargo install aiken --version ${AIKEN_VERSION}
RUN echo "source <(aiken completion bash)" >> ~/.bashrc
