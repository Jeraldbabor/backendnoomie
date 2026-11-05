# syntax=docker/dockerfile:1

# PostgreSQL with the pgvector extension, which the food scan uses to compare photo fingerprints.
#
# pgvector is built here instead of using the pgvector/pgvector image, because that image is
# Debian and this project's databases were created on Alpine. Text sorts differently between
# the two, so moving an existing database across would silently break its text indexes
# (such as the unique index on emails).
FROM postgres:18-alpine

ADD --checksum=sha256:cac0b10c360f05b2d521200105ba3697e773d4cd3731f5a915a7e37ebe0bea85 \
    https://github.com/pgvector/pgvector/archive/refs/tags/v0.8.7.tar.gz /tmp/pgvector.tar.gz

# OPTFLAGS="" avoids -march=native, so the image runs on any x86-64 or arm64 machine.
# with_llvm=no skips JIT bitcode, which would need the whole LLVM toolchain to build.
RUN apk add --no-cache --virtual .build-deps build-base \
    && mkdir /tmp/pgvector \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp/pgvector --strip-components=1 \
    && make -C /tmp/pgvector OPTFLAGS="" with_llvm=no \
    && make -C /tmp/pgvector OPTFLAGS="" with_llvm=no install \
    && apk del .build-deps \
    && rm -rf /tmp/pgvector /tmp/pgvector.tar.gz
