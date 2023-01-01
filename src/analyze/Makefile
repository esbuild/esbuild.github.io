FLAGS += --bundle
FLAGS += --external:*.svg
FLAGS += --inject:inject.ts
FLAGS += --mangle-props=_$$
FLAGS += --minify
FLAGS += --outdir=../../out/analyze
FLAGS += --target=chrome51
FLAGS += index.ts

build: ../../out/analyze/index.html
	../../node_modules/.bin/esbuild $(FLAGS)

watch: ../../out/analyze/index.html
	../../node_modules/.bin/esbuild $(FLAGS) --watch

serve: ../../out/analyze/index.html
	../../node_modules/.bin/esbuild $(FLAGS) --servedir=../../out

../../out/analyze:
	mkdir -p ../../out/analyze

../../out/analyze/index.html: index.html | ../../out/analyze
	cp index.html ../../out/analyze/index.html
