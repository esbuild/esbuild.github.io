FLAGS += --bundle
FLAGS += --external:*.svg
FLAGS += --inject:inject.ts
FLAGS += --loader:.html=copy
FLAGS += --mangle-props=_$$
FLAGS += --minify
FLAGS += --outdir=../../out/analyze
FLAGS += --target=chrome51
FLAGS += index.html
FLAGS += index.ts

prod:
	../../node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=false

dev:
	../../node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=true --watch --servedir=../../out
