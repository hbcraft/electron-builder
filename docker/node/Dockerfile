ARG IMAGE_VERSION=base
FROM --platform=linux/x86_64 electronuserland/builder:$IMAGE_VERSION

ARG NODE_VERSION

# this package is used for snapcraft and we should not clear apt list - to avoid apt-get update during snap build
RUN curl -L https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz | tar xz -C /usr/local --strip-components=1 && \
  unlink /usr/local/CHANGELOG.md && unlink /usr/local/LICENSE && unlink /usr/local/README.md && \
  # https://github.com/npm/npm/issues/4531
  echo "unsafe-perm true" > .npmrc
RUN npm i -g pnpm@9.4.0
