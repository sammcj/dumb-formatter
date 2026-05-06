SHELL := /usr/bin/env bash

.PHONY: help install lint lint-fix test test-unit test-integration build watch package install-vsix uninstall-vsix publish-marketplace publish-openvsx publish clean

help:
	@echo "dumb-formatter targets:"
	@echo "  install               Install dependencies"
	@echo "  lint                  Run eslint"
	@echo "  lint-fix              Run eslint --fix"
	@echo "  test                  Run unit + integration tests"
	@echo "  test-unit             Run unit tests only"
	@echo "  test-integration      Run integration tests via @vscode/test-cli"
	@echo "  build                 Build the extension bundle (production)"
	@echo "  watch                 Build the extension bundle in watch mode"
	@echo "  package               Produce a .vsix"
	@echo "  install-vsix          Build, package and install the .vsix into local VS Code"
	@echo "  uninstall-vsix        Uninstall the extension from local VS Code"
	@echo "  publish-marketplace   Publish to the VS Code Marketplace (vsce)"
	@echo "  publish-openvsx       Publish to Open VSX (ovsx)"
	@echo "  publish               Publish to both registries"
	@echo "  clean                 Remove build artefacts"

install:
	pnpm install --frozen-lockfile

lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

test-unit:
	pnpm run test:unit

test-integration: build
	pnpm exec tsc -p ./
	pnpm run test:integration

test: test-unit test-integration

build:
	NODE_ENV=production pnpm run compile

watch:
	pnpm run watch

package: build
	pnpm run vsce:package

install-vsix: package
	@vsix=$$(ls -t dumb-formatter-*.vsix 2>/dev/null | head -1); \
	if [ -z "$$vsix" ]; then echo "no .vsix found"; exit 1; fi; \
	code --install-extension "$$vsix" --force

uninstall-vsix:
	code --uninstall-extension sammcj.dumb-formatter

publish-marketplace: package
	pnpm run vsce:publish

publish-openvsx: package
	pnpm run ovsx:publish

publish: publish-marketplace publish-openvsx

clean:
	rm -rf out dist node_modules/.cache .vscode-test *.vsix
