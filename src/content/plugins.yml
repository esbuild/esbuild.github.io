title: Plugins
body:
  - h1: Plugins

  - p: >
      The plugin API allows you to inject code into various parts of the build
      process. Unlike the rest of the API, it's not available from the command
      line. You must write either JavaScript or Go code to use the plugin API.
      Plugins can also only be used with the [build](/api/#build) API, not
      with the [transform](/api/#transform) API.

  - h2: Finding plugins
  - p: >
      If you're looking for an existing esbuild plugin, you should check out the
      [list of existing esbuild plugins](https://github.com/esbuild/community-plugins).
      Plugins on this list have been deliberately added by the author and are
      intended to be used by others in the esbuild community.

  - p: >
      If you want to share your esbuild plugin, you should:

  - ol:
    - >
      [Publish it to npm](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)
      so others can install it.

    - >
      Add it to the [list of existing esbuild plugins](https://github.com/esbuild/community-plugins)
      so others can find it.

  - h2: Using plugins
  - p: >
      An esbuild plugin is an object with a `name` and a `setup` function. They
      are passed in an array to the [build](/api/#build) API call. The `setup`
      function is run once for each build API call.

  - p: >
      Here's a simple plugin example that allows you to import the current
      environment variables at build time:

  - example:
      in:
        app.js: |
          import { PATH } from 'env'
          console.log(`PATH is ${PATH}`)

      mjs: |
        import * as esbuild from 'esbuild'

        let envPlugin = {
          name: 'env',
          setup(build) {
            // Intercept import paths called "env" so esbuild doesn't attempt
            // to map them to a file system location. Tag them with the "env-ns"
            // namespace to reserve them for this plugin.
            build.onResolve({ filter: /^env$/ }, args => ({
              path: args.path,
              namespace: 'env-ns',
            }))

            // Load paths tagged with the "env-ns" namespace and behave as if
            // they point to a JSON file containing the environment variables.
            build.onLoad({ filter: /.*/, namespace: 'env-ns' }, () => ({
              contents: JSON.stringify(process.env),
              loader: 'json',
            }))
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [envPlugin],
        })

      go: |
        package main

        import "encoding/json"
        import "os"
        import "strings"
        import "github.com/evanw/esbuild/pkg/api"

        var envPlugin = api.Plugin{
          Name: "env",
          Setup: func(build api.PluginBuild) {
            // Intercept import paths called "env" so esbuild doesn't attempt
            // to map them to a file system location. Tag them with the "env-ns"
            // namespace to reserve them for this plugin.
            build.OnResolve(api.OnResolveOptions{Filter: `^env$`},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                return api.OnResolveResult{
                  Path:      args.Path,
                  Namespace: "env-ns",
                }, nil
              })

            // Load paths tagged with the "env-ns" namespace and behave as if
            // they point to a JSON file containing the environment variables.
            build.OnLoad(api.OnLoadOptions{Filter: `.*`, Namespace: "env-ns"},
              func(args api.OnLoadArgs) (api.OnLoadResult, error) {
                mappings := make(map[string]string)
                for _, item := range os.Environ() {
                  if equals := strings.IndexByte(item, '='); equals != -1 {
                    mappings[item[:equals]] = item[equals+1:]
                  }
                }
                bytes, err := json.Marshal(mappings)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                contents := string(bytes)
                return api.OnLoadResult{
                  Contents: &contents,
                  Loader:   api.LoaderJSON,
                }, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{envPlugin},
            Write:       true,
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      You would use it like this:

  - pre.js: |
      import { PATH } from 'env'
      console.log(`PATH is ${PATH}`)

  - h2: Concepts

  - p: >
      Writing a plugin for esbuild works a little differently than writing a
      plugin for other bundlers. The concepts below are important to understand
      before developing your plugin:

  - h3: Namespaces

  - p: >
      Every module has an associated namespace. By default esbuild operates
      in the `file` namespace, which corresponds to files on the file
      system. But esbuild can also handle "virtual" modules that don't have
      a corresponding location on the file system. One case when this happens
      is when a module is provided using [stdin](/api/#stdin).

  - p: >
      Plugins can be used to create virtual modules. Virtual modules usually
      use a namespace other than `file` to distinguish them from file system
      modules. Usually the namespace is specific to the plugin that created
      them. For example, the sample [HTTP plugin](#http-plugin) below uses
      the `http-url` namespace for downloaded files.

  - h3: Filters

  - p: >
      Every callback must provide a regular expression as a filter. This is
      used by esbuild to skip calling the callback when the path doesn't match
      its filter, which is done for performance. Calling from esbuild's
      highly-parallel internals into single-threaded JavaScript code is
      expensive and should be avoided whenever possible for maximum speed.

  - p: >
      You should try to use the filter regular expression instead of using
      JavaScript code for filtering whenever you can. This is faster
      because the regular expression is evaluated inside of esbuild without
      calling out to JavaScript at all. For example, the sample
      [HTTP plugin](#http-plugin) below uses a filter of `^https?://` to
      ensure that the performance overhead of running the plugin is only
      incurred for paths that start with `http://` or `https://`.

  - p: >
      The allowed regular expression syntax is the syntax supported by Go's
      [regular expression engine](https://pkg.go.dev/regexp/). This is
      slightly different than JavaScript. Specifically, look-ahead,
      look-behind, and backreferences are not supported. Go's regular
      expression engine is designed to avoid the catastrophic
      exponential-time worst case performance issues that can affect
      JavaScript regular expressions.

  - p: >
      Note that namespaces can also be used for filtering. Callbacks must
      provide a filter regular expression but can optionally also provide a
      namespace to further restrict what paths are matched. This can be useful
      for "remembering" where a virtual module came from. Keep in mind that
      namespaces are matched using an exact string equality test instead of a
      regular expression, so unlike module paths they are not intended for
      storing arbitrary data.

  - h2#on-resolve: On-resolve callbacks

  - p: >
      A callback added using `onResolve` will be run on each import path in
      each module that esbuild builds. The callback can customize how esbuild
      does path resolution. For example, it can intercept import paths and
      redirect them somewhere else. It can also mark paths as external. Here
      is an example:

  - example:
      in:
        app.js: |
          import "images/1.png"
          import "http://example.com"

        public/images/1.png: |
          this is an image

      mjs: |
        import * as esbuild from 'esbuild'
        import path from 'node:path'

        let exampleOnResolvePlugin = {
          name: 'example',
          setup(build) {
            // Redirect all paths starting with "images/" to "./public/images/"
            build.onResolve({ filter: /^images\// }, args => {
              return { path: path.join(args.resolveDir, 'public', args.path) }
            })

            // Mark all paths starting with "http://" or "https://" as external
            build.onResolve({ filter: /^https?:\/\// }, args => {
              return { path: args.path, external: true }
            })
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [exampleOnResolvePlugin],
          loader: { '.png': 'binary' },
        })

      go: |
        package main

        import "os"
        import "path/filepath"
        import "github.com/evanw/esbuild/pkg/api"

        var exampleOnResolvePlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            // Redirect all paths starting with "images/" to "./public/images/"
            build.OnResolve(api.OnResolveOptions{Filter: `^images/`},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                return api.OnResolveResult{
                  Path: filepath.Join(args.ResolveDir, "public", args.Path),
                }, nil
              })

            // Mark all paths starting with "http://" or "https://" as external
            build.OnResolve(api.OnResolveOptions{Filter: `^https?://`},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                return api.OnResolveResult{
                  Path:     args.Path,
                  External: true,
                }, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{exampleOnResolvePlugin},
            Write:       true,
            Loader: map[string]api.Loader{
              ".png": api.LoaderBinary,
            },
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      The callback can return without providing a path to pass on responsibility
      for path resolution to the next callback. For a given import path, all
      `onResolve` callbacks from all plugins will be run in the order they were
      registered until one takes responsibility for path resolution. If no
      callback returns a path, esbuild will run its default path resolution
      logic.

  - p: >
      Keep in mind that many callbacks may be running concurrently. In
      JavaScript, if your callback does expensive work that can run on another
      thread such as <code>fs.<wbr>existsSync()</code>, you should make the
      callback `async` and use `await` (in this case with
      <code>fs.<wbr>promises.<wbr>exists()</code>) to allow other code to run
      in the meantime. In Go, each callback may be run on a separate goroutine.
      Make sure you have appropriate synchronization in place if your plugin
      uses any shared data structures.

  - h3: On-resolve options

  - p: >
      The `onResolve` API is meant to be called within the `setup` function and
      registers a callback to be triggered in certain situations. It takes a
      few options:

  - example:
      noCheck: true

      js: |
        interface OnResolveOptions {
          filter: RegExp;
          namespace?: string;
        }

      go: |
        type OnResolveOptions struct {
          Filter    string
          Namespace string
        }

  - ul:
    - >
        `filter`
        <p>
        Every callback must provide a filter, which is a regular expression.
        The registered callback will be skipped when the path doesn't match
        this filter. You can read more about filters [here](#filters).
        </p>

    - >
        `namespace`
        <p>
        This is optional. If provided, the callback is only run on paths within
        modules in the provided namespace. You can read more about namespaces [here](#namespaces).
        </p>

  - h3: On-resolve arguments

  - p: >
      When esbuild calls the callback registered by `onResolve`, it will
      provide these arguments with information about the imported path:

  - example:
      noCheck: true

      js: |
        interface OnResolveArgs {
          path: string;
          importer: string;
          namespace: string;
          resolveDir: string;
          kind: ResolveKind;
          pluginData: any;
          with: Record<string, string>;
        }

        type ResolveKind =
          | 'entry-point'
          | 'import-statement'
          | 'require-call'
          | 'dynamic-import'
          | 'require-resolve'
          | 'import-rule'
          | 'composes-from'
          | 'url-token'


      go: |
        type OnResolveArgs struct {
          Path       string
          Importer   string
          Namespace  string
          ResolveDir string
          Kind       ResolveKind
          PluginData interface{}
          With       map[string]string
        }

        const (
          ResolveEntryPoint        ResolveKind
          ResolveJSImportStatement ResolveKind
          ResolveJSRequireCall     ResolveKind
          ResolveJSDynamicImport   ResolveKind
          ResolveJSRequireResolve  ResolveKind
          ResolveCSSImportRule     ResolveKind
          ResolveCSSComposesFrom   ResolveKind
          ResolveCSSURLToken       ResolveKind
        )

  - ul:
    - >
      `path`
      <p>
      This is the verbatim unresolved path from the underlying module's
      source code. It can take any form. While esbuild's default behavior is
      to interpret import paths as either a relative path or a package name,
      plugins can be used to introduce new path forms. For example, the
      sample [HTTP plugin](#http-plugin) below gives special meaning to
      paths starting with `http://`.
      </p>

    - >
      `importer`
      <p>
      This is the path of the module containing this import to be resolved.
      Note that this path is only guaranteed to be a file system path if the
      namespace is `file`. If you want to resolve a path relative to the
      directory containing the importer module, you should use `resolveDir`
      instead since that also works for virtual modules.
      </p>

    - >
      `namespace`
      <p>
      This is the namespace of the module containing this import to be resolved,
      as set by the [on-load callback](#on-load) that loaded this file.
      This defaults to the `file` namespace for modules loaded with esbuild's
      default behavior. You can read more about namespaces [here](#namespaces).
      </p>

    - >
      `resolveDir`
      <p>
      This is the file system directory to use when resolving an import path
      to a real path on the file system. For modules in the `file` namespace,
      this value defaults to the directory part of the module path. For virtual
      modules this value defaults to empty but [on-load callbacks](#on-load)
      can optionally give virtual modules a resolve directory too. If that
      happens, it will be provided to resolve callbacks for unresolved paths
      in that file.
      </p>

    - >
      `kind`
      <p>
      This says how the path to be resolved is being imported. For example,
      <code>'entry-<wbr>point'</code> means the path was provided to the API as
      an entry point path, <code>'import-<wbr>statement'</code> means the path
      is from a JavaScript `import` or `export` statement, and
      <code>'import-<wbr>rule'</code> means the path is from a CSS `@import`
      rule.
      </p>

    - >
      `pluginData`
      <p>
      This property is passed from the previous plugin, as set by the
      [on-load callback](#on-load) that loaded this file.
      </p>

    - >
      `with`
      <p>
      This contains a map of the [import attributes](https://github.com/tc39/proposal-import-attributes)
      that were present on the import statement used to import this module. For
      example, a module imported using <code>with { <wbr>type: <wbr>'json' }</code>
      will provide a `with` value of <code>{ type: <wbr>'json' }</code> to plugins.
      You can use this to resolve to a different path depending on the import
      attributes.
      </p>

  - h3: On-resolve results

  - p: >
      This is the object that can be returned by a callback added using
      `onResolve` to provide a custom path resolution. If you would like to
      return from the callback without providing a path, just return the default
      value (so `undefined` in JavaScript and `OnResolveResult{}` in Go). Here
      are the optional properties that can be returned:

  - example:
      noCheck: true

      js: |
        interface OnResolveResult {
          errors?: Message[];
          external?: boolean;
          namespace?: string;
          path?: string;
          pluginData?: any;
          pluginName?: string;
          sideEffects?: boolean;
          suffix?: string;
          warnings?: Message[];
          watchDirs?: string[];
          watchFiles?: string[];
        }

        interface Message {
          text: string;
          location: Location | null;
          detail: any; // The original error from a JavaScript plugin, if applicable
        }

        interface Location {
          file: string;
          namespace: string;
          line: number; // 1-based
          column: number; // 0-based, in bytes
          length: number; // in bytes
          lineText: string;
        }

      go: |
        type OnResolveResult struct {
          Errors      []Message
          External    bool
          Namespace   string
          Path        string
          PluginData  interface{}
          PluginName  string
          SideEffects SideEffects
          Suffix      string
          Warnings    []Message
          WatchDirs   []string
          WatchFiles  []string
        }

        type Message struct {
          Text     string
          Location *Location
          Detail   interface{} // The original error from a Go plugin, if applicable
        }

        type Location struct {
          File      string
          Namespace string
          Line      int // 1-based
          Column    int // 0-based, in bytes
          Length    int // in bytes
          LineText  string
        }

  - ul:
    - >
      `path`
      <p>
      Set this to a non-empty string to resolve the import to a specific path.
      If this is set, no more on-resolve callbacks will be run for this import
      path in this module. If this is not set, esbuild will continue to run
      on-resolve callbacks that were registered after the current one. Then, if
      the path still isn't resolved, esbuild will default to resolving the path
      relative to the resolve directory of the current module.
      </p>

    - >
      `external`
      <p>
      Set this to `true` to mark the module as [external](/api/#external), which
      means it will not be included in the bundle and will instead be imported
      at run-time.
      </p>

    - >
      `namespace`
      <p>
      This is the namespace associated with the resolved path. If left empty,
      it will default to the `file` namespace for non-external paths. Paths in
      the file namespace must be an absolute path for the current file system
      (so starting with a forward slash on Unix and with a drive letter on
      Windows).
      </p>
      <p>
      If you want to resolve to a path that isn't a file system path, you
      should set the namespace to something other than `file` or an empty
      string. This tells esbuild to not treat the path as pointing to something
      on the file system.
      </p>

    - >
      `errors` and `warnings`
      <p>
      These properties let you pass any log messages generated during path
      resolution to esbuild where they will be displayed in the terminal
      according to the current [log level](/api/#log-level) and end up in the
      final build result. For example, if you are calling a library and that
      library can return errors and/or warnings, you will want to forward them
      using these properties.
      </p>
      <p>
      If you only have a single error to return, you don't have to pass it via
      `errors`. You can simply throw the error in JavaScript or return the
      `error` object as the second return value in Go.
      </p>

    - >
      `watchFiles` and `watchDirs`
      <p>
      These properties let you return additional file system paths for esbuild's
      [watch mode](/api/#watch) to scan. By default esbuild will only scan the
      path provided to `onLoad` plugins, and only if the namespace is `file`.
      If your plugin needs to react to additional changes in the file system,
      it needs to use one of these properties.
      </p>
      <p>
      A rebuild will be triggered if any file in the `watchFiles` array has been
      changed since the last build. Change detection is somewhat complicated
      and may check the file contents and/or the file's metadata.
      </p>
      <p>
      A rebuild will also be triggered if the list of directory entries for any
      directory in the `watchDirs` array has been changed since the last build.
      Note that this does not check anything about the contents of any file
      in these directories, and it also does not check any subdirectories. Think
      of this as checking the output of the Unix `ls` command.
      </p>
      <p>
      For robustness, you should include all file system paths that were used
      during the evaluation of the plugin. For example, if your plugin does
      something equivalent to `require.resolve()`, you'll need to include the
      paths of all "does this file exist" checks, not just the final path.
      Otherwise a new file could be created that causes the build to become
      outdated, but esbuild doesn't detect it because that path wasn't listed.
      </p>

    - >
      `pluginName`
      <p>
      This property lets you replace this plugin's name with another name for
      this path resolution operation. It's useful for proxying another plugin
      through this plugin. For example, it lets you have a single plugin that
      forwards to a child process containing multiple plugins. You probably
      won't need to use this.
      </p>

    - >
      `pluginData`
      <p>
      This property will be passed to the next plugin that runs in the plugin
      chain. If you return it from an `onLoad` plugin, it will be passed to
      the `onResolve` plugins for any imports in that file, and if you return
      it from an `onResolve` plugin, an arbitrary one will be passed to the
      `onLoad` plugin when it loads the file (it's arbitrary since the
      relationship is many-to-one). This is useful to pass data between
      different plugins without them having to coordinate directly.
      </p>

    - >
      `sideEffects`
      <p>
      Setting this property to false tells esbuild that imports of this module
      can be removed if the imported names are unused. This behaves as if
      `"sideEffects": false` was specified the corresponding `package.json` file.
      For example, <code>import { x } <wbr>from "y"</code> may be completely
      removed if `x` is unused and `y` has been marked as `sideEffects: false`.
      You can read more about what `sideEffects` means in
      [Webpack's documentation about the feature](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free).
      </p>

    - >
      `suffix`
      <p>
      Returning a value here lets you pass along an optional URL query or hash
      to append to the path that is not included in the path itself. Storing
      this separately is beneficial in cases when the path is processed by
      something that is not aware of the suffix, either by esbuild itself or
      by another plugin.
      </p>
      <p>
      For example, an on-resolve plugin might return a suffix of `?#iefix` for
      a `.eot` file in a build with a different on-load plugin for paths ending
      in `.eot`. Keeping the suffix separate means the suffix is still associated
      with the path but the `.eot` plugin will still match the file without
      needing to know anything about suffixes.
      </p>
      <p>
      If you do set a suffix, it must begin with either `?` or `#` because
      it's intended to be a URL query or hash. This feature has certain
      obscure uses such as hacking around bugs in IE8's CSS parser and may
      not be that useful otherwise. If you do use it, keep in mind that each
      unique namespace, path, and suffix combination is considered by esbuild
      to be a unique module identifier so by returning a different suffix for
      the same path, you are telling esbuild to create another copy of the
      module.
      </p>

  - h2#on-load: On-load callbacks

  - p: >
      A callback added using `onLoad` will be run for each unique path/<wbr>namespace
      pair that has not been marked as external. Its job is to return the
      contents of the module and to tell esbuild how to interpret it. Here's
      an example plugin that converts `.txt` files into an array of words:

  - example:
      in:
        app.js: |
          import words from './file.txt'
          console.log(words)
        file.txt: |
          these are some words

      mjs: |
        import * as esbuild from 'esbuild'
        import fs from 'node:fs'

        let exampleOnLoadPlugin = {
          name: 'example',
          setup(build) {
            // Load ".txt" files and return an array of words
            build.onLoad({ filter: /\.txt$/ }, async (args) => {
              let text = await fs.promises.readFile(args.path, 'utf8')
              return {
                contents: JSON.stringify(text.split(/\s+/)),
                loader: 'json',
              }
            })
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [exampleOnLoadPlugin],
        })

      go: |
        package main

        import "encoding/json"
        import "io/ioutil"
        import "os"
        import "strings"
        import "github.com/evanw/esbuild/pkg/api"

        var exampleOnLoadPlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            // Load ".txt" files and return an array of words
            build.OnLoad(api.OnLoadOptions{Filter: `\.txt$`},
              func(args api.OnLoadArgs) (api.OnLoadResult, error) {
                text, err := ioutil.ReadFile(args.Path)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                bytes, err := json.Marshal(strings.Fields(string(text)))
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                contents := string(bytes)
                return api.OnLoadResult{
                  Contents: &contents,
                  Loader:   api.LoaderJSON,
                }, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{exampleOnLoadPlugin},
            Write:       true,
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      The callback can return without providing the contents of the module. In
      that case the responsibility for loading the module is passed to the next
      registered callback. For a given module, all `onLoad` callbacks from all
      plugins will be run in the order they were registered until one takes
      responsibility for loading the module. If no callback returns contents
      for the module, esbuild will run its default module loading logic.

  - p: >
      Keep in mind that many callbacks may be running concurrently. In
      JavaScript, if your callback does expensive work that can run on another
      thread such as <code>fs.<wbr>readFileSync()</code>, you should make the
      callback `async` and use `await` (in this case with
      <code>fs.<wbr>promises.<wbr>readFile()</code>) to allow other code to run
      in the meantime. In Go, each callback may be run on a separate goroutine.
      Make sure you have appropriate synchronization in place if your plugin
      uses any shared data structures.

  - h3: On-load options

  - p: >
      The `onLoad` API is meant to be called within the `setup` function and
      registers a callback to be triggered in certain situations. It takes a
      few options:

  - example:
      noCheck: true

      js: |
        interface OnLoadOptions {
          filter: RegExp;
          namespace?: string;
        }

      go: |
        type OnLoadOptions struct {
          Filter    string
          Namespace string
        }

  - ul:
    - >
        `filter`
        <p>
        Every callback must provide a filter, which is a regular expression.
        The registered callback will be skipped when the path doesn't match
        this filter. You can read more about filters [here](#filters).
        </p>

    - >
        `namespace`
        <p>
        This is optional. If provided, the callback is only run on paths within
        modules in the provided namespace. You can read more about namespaces [here](#namespaces).
        </p>

  - h3: On-load arguments

  - p: >
      When esbuild calls the callback registered by `onLoad`, it will
      provide these arguments with information about the module to load:

  - example:
      noCheck: true

      js: |
        interface OnLoadArgs {
          path: string;
          namespace: string;
          suffix: string;
          pluginData: any;
          with: Record<string, string>;
        }

      go: |
        type OnLoadArgs struct {
          Path       string
          Namespace  string
          Suffix     string
          PluginData interface{}
          With       map[string]string
        }

  - ul:
    - >
      `path`
      <p>
      This is the fully-resolved path to the module. It should be considered a
      file system path if the namespace is `file`, but otherwise the path can
      take any form. For example, the sample [HTTP plugin](#http-plugin) below
      gives special meaning to paths starting with `http://`.
      </p>

    - >
      `namespace`
      <p>
      This is the namespace that the module path is in, as set by the
      [on-resolve callback](#on-resolve) that resolved this file. It
      defaults to the `file` namespace for modules loaded with esbuild's
      default behavior. You can read more about namespaces [here](#namespaces).
      </p>

    - >
      `suffix`
      <p>
      This is the URL query and/or hash at the end of the file path, if there
      is one. It's either filled in by esbuild's native path resolution behavior
      or returned by the [on-resolve callback](#on-resolve) that resolved
      this file. This is stored separately from the path so that most plugins
      can just deal with the path and ignore the suffix. The on-load behavior
      that's built into esbuild just ignores the suffix and loads the file
      from its path alone.
      </p>
      <p>
      For context, IE8's CSS parser has a bug where it considers certain URLs
      to extend to the last `)` instead of the first `)`. So the CSS code
      <code>url('Foo.eot') <wbr>format('eot')</code> is incorrectly considered
      to have a URL of <code>Foo.eot') <wbr>format('eot</code>. To avoid this,
      people typically add something like `?#iefix` so that IE8 sees the URL
      as <code>Foo.eot?#iefix') <wbr>format('eot</code>. Then the path part of
      the URL is `Foo.eot` and the query part is <code>?#iefix') <wbr>format('eot</code>,
      which means IE8 can find the file `Foo.eot` by discarding the query.
      </p>
      <p>
      The suffix feature was added to esbuild to handle CSS files containing
      these hacks. A URL of `Foo.eot?#iefix` should be considered [external](/api/#external)
      if all files matching `*.eot` have been marked as external, but the
      `?#iefix` suffix should still be present in the final output file.
      </p>

    - >
      `pluginData`
      <p>
      This property is passed from the previous plugin, as set by the
      [on-resolve callback](#on-resolve) that runs in the plugin
      chain.
      </p>

    - >
      `with`
      <p>
      This contains a map of the [import attributes](https://github.com/tc39/proposal-import-attributes)
      that were present on the import statement used to import this module. For
      example, a module imported using <code>with { <wbr>type: <wbr>'json' }</code>
      will provide a `with` value of <code>{ type: <wbr>'json' }</code> to plugins.
      A given module is loaded separately for each unique combination of import
      attributes, so these attributes are guaranteed to have been provided by all
      import statements used to import this module. That means they can be used
      by the plugin to alter the content of this module.
      </p>

  - h3: On-load results

  - p: >
      This is the object that can be returned by a callback added using
      `onLoad` to provide the contents of a module. If you would like to return
      from the callback without providing any contents, just return the default
      value (so `undefined` in JavaScript and `OnLoadResult{}` in Go). Here
      are the optional properties that can be returned:

  - example:
      noCheck: true

      js: |
        interface OnLoadResult {
          contents?: string | Uint8Array;
          errors?: Message[];
          loader?: Loader;
          pluginData?: any;
          pluginName?: string;
          resolveDir?: string;
          warnings?: Message[];
          watchDirs?: string[];
          watchFiles?: string[];
        }

        interface Message {
          text: string;
          location: Location | null;
          detail: any; // The original error from a JavaScript plugin, if applicable
        }

        interface Location {
          file: string;
          namespace: string;
          line: number; // 1-based
          column: number; // 0-based, in bytes
          length: number; // in bytes
          lineText: string;
        }

      go: |
        type OnLoadResult struct {
          Contents   *string
          Errors     []Message
          Loader     Loader
          PluginData interface{}
          PluginName string
          ResolveDir string
          Warnings   []Message
          WatchDirs  []string
          WatchFiles []string
        }

        type Message struct {
          Text     string
          Location *Location
          Detail   interface{} // The original error from a Go plugin, if applicable
        }

        type Location struct {
          File      string
          Namespace string
          Line      int // 1-based
          Column    int // 0-based, in bytes
          Length    int // in bytes
          LineText  string
        }

  - ul:
    - >
      `contents`
      <p>
      Set this to a string to specify the contents of the module. If this is
      set, no more on-load callbacks will be run for this resolved path. If
      this is not set, esbuild will continue to run on-load callbacks that were
      registered after the current one. Then, if the contents are still not set,
      esbuild will default to loading the contents from the file system if the
      resolved path is in the `file` namespace.
      </p>

    - >
      `loader`
      <p>
      This tells esbuild how to interpret the contents. For example, the
      [`js`](/content-types/#javascript) loader interprets the contents as
      JavaScript and the [`css`](/content-types/#css) loader interprets the
      contents as CSS. The loader defaults to `js` if it's not specified.
      See the [content types](/content-types/) page for a complete list of
      all built-in loaders.
      </p>

    - >
      `resolveDir`
      <p>
      This is the file system directory to use when resolving an import path
      in this module to a real path on the file system. For modules in the
      `file` namespace, this value defaults to the directory part of the module
      path. Otherwise this value defaults to empty unless the plugin provides
      one. If the plugin doesn't provide one, esbuild's default behavior won't
      resolve any imports in this module. This directory will be passed to any
      [on-resolve callbacks](#on-resolve) that run on unresolved import
      paths in this module.
      </p>

    - >
      `errors` and `warnings`
      <p>
      These properties let you pass any log messages generated during path
      resolution to esbuild where they will be displayed in the terminal
      according to the current [log level](/api/#log-level) and end up in the
      final build result. For example, if you are calling a library and that
      library can return errors and/or warnings, you will want to forward them
      using these properties.
      </p>
      <p>
      If you only have a single error to return, you don't have to pass it via
      `errors`. You can simply throw the error in JavaScript or return the
      `error` object as the second return value in Go.
      </p>

    - >
      `watchFiles` and `watchDirs`
      <p>
      These properties let you return additional file system paths for esbuild's
      [watch mode](/api/#watch) to scan. By default esbuild will only scan the
      path provided to `onLoad` plugins, and only if the namespace is `file`.
      If your plugin needs to react to additional changes in the file system,
      it needs to use one of these properties.
      </p>
      <p>
      A rebuild will be triggered if any file in the `watchFiles` array has been
      changed since the last build. Change detection is somewhat complicated
      and may check the file contents and/or the file's metadata.
      </p>
      <p>
      A rebuild will also be triggered if the list of directory entries for any
      directory in the `watchDirs` array has been changed since the last build.
      Note that this does not check anything about the contents of any file
      in these directories, and it also does not check any subdirectories. Think
      of this as checking the output of the Unix `ls` command.
      </p>
      <p>
      For robustness, you should include all file system paths that were used
      during the evaluation of the plugin. For example, if your plugin does
      something equivalent to `require.resolve()`, you'll need to include the
      paths of all "does this file exist" checks, not just the final path.
      Otherwise a new file could be created that causes the build to become
      outdated, but esbuild doesn't detect it because that path wasn't listed.
      </p>

    - >
      `pluginName`
      <p>
      This property lets you replace this plugin's name with another name for
      this module load operation. It's useful for proxying another plugin
      through this plugin. For example, it lets you have a single plugin that
      forwards to a child process containing multiple plugins. You probably
      won't need to use this.
      </p>

    - >
      `pluginData`
      <p>
      This property will be passed to the next plugin that runs in the plugin
      chain. If you return it from an `onLoad` plugin, it will be passed to
      the `onResolve` plugins for any imports in that file, and if you return
      it from an `onResolve` plugin, an arbitrary one will be passed to the
      `onLoad` plugin when it loads the file (it's arbitrary since the
      relationship is many-to-one). This is useful to pass data between
      different plugins without them having to coordinate directly.
      </p>

  - h3: Caching your plugin

  - p: >
      Since esbuild is so fast, it's often the case that plugin evaluation is
      the main bottleneck when building with esbuild. Caching of plugin
      evaluation is left up to each plugin instead of being a part of esbuild
      itself because cache invalidation is plugin-specific. If you are writing
      a slow plugin that needs a cache to be fast, you will have to write the
      cache logic yourself.

  - p: >
      A cache is essentially a map that memoizes the transform function that
      represents your plugin. The keys of the map usually contain the inputs
      to your transform function and the values of the map usually contain the
      outputs of your transform function. In addition, the map usually has some
      form of least-recently-used cache eviction policy to avoid continually
      growing larger in size over time.

  - p: >
      The cache can either be stored in memory (beneficial for use with
      esbuild's [rebuild](/api/#rebuild) API), on disk (beneficial for caching
      across separate build script invocations), or even on a server (beneficial
      for really slow transforms that can be shared between different developer
      machines). Where to store the cache is case-specific and depends on your
      plugin.

  - p: >
      Here is a simple caching example. Say we want to cache the function
      `slowTransform()` that takes as input the contents of a file in the
      `*.example` format and transforms it to JavaScript. An in-memory cache
      that avoids redundant calls to this function when used with esbuild's
      [rebuild](/api/#rebuild) API) might look something like this:

  - pre.js: |
      import fs from 'node:fs'

      let examplePlugin = {
        name: 'example',
        setup(build) {
          let cache = new Map

          build.onLoad({ filter: /\.example$/ }, async (args) => {
            let input = await fs.promises.readFile(args.path, 'utf8')
            let key = args.path
            let value = cache.get(key)

            if (!value || value.input !== input) {
              let contents = slowTransform(input)
              value = { input, output: { contents } }
              cache.set(key, value)
            }

            return value.output
          })
        }
      }

  - p: >
      Some important caveats about the caching code above:

  - ul:
    - >
      <p>
      There is no cache eviction policy present in the code above. Memory usage
      will continue to grow if more and more keys are added to the cache map.
      <p>
      </p>
      To combat this limitation somewhat, the `input` value is stored in the
      cache `value` instead of in the cache `key`. This means that changing the
      contents of a file will not leak memory because the key only includes the
      file path, not the file contents. Changing the file contents only overwrites
      the previous cache entry. This is probably fine for common usage where
      someone repeatedly edits the same file in between incremental rebuilds
      and only occasionally adds or renames files.
      <p>
      </p>
      But the cache will continue to grow in size if each build
      contains new unique path names (e.g. perhaps an auto-generated temporary
      file path containing the current time). A more advanced version might use
      a least-recently-used eviction policy.
      </p>

    - |
      <p>
      Cache invalidation only works if `slowTransform()` is a [pure function](https://en.wikipedia.org/wiki/Pure_function)
      (meaning that the output of the function *only* depends on the inputs to
      the function) and if all of the inputs to the function are somehow
      captured in the lookup to the cache map. For example if the transform
      function automatically reads the contents of some other files and the
      output depends on the contents of those files too, then the cache would
      fail to be invalidated when those files are changed because they are not
      included in the cache key.
      </p>
      <p>
      This part is easy to mess up so it's worth going through a specific
      example. Consider a plugin that implements a compile-to-CSS language.
      If that plugin implements `@import` rules itself by parsing imported
      files and either bundles them or makes any exported variable declarations
      available to the importing code, your plugin will not be correct if it
      only checks that the importing file's contents haven't changed because a
      change to the imported file could also invalidate the cache.
      </p>
      <p>
      You may be thinking that you could just add the contents of the imported
      file to the cache key to fix this problem. However, even that may be
      incorrect. Say for example this plugin uses [`require.resolve()`](https://nodejs.org/api/modules.html#modules_require_resolve_request_options)
      to resolve the import path to an absolute file path. This is a common
      approach because it uses node's built-in path resolution that can resolve
      to a path inside a package. This function usually does many checks for
      files in different locations before returning the resolved path. For
      example, importing the path `pkg/file` from the file `src/entry.css` might
      check the following locations (yes, node's package resolution algorithm is
      very inefficient):
      </p>
      <pre>
      src/node_modules/pkg/file
      src/node_modules/pkg/file.css
      src/node_modules/pkg/file/package.json
      src/node_modules/pkg/file/main
      src/node_modules/pkg/file/main.css
      src/node_modules/pkg/file/main/index.css
      src/node_modules/pkg/file/index.css
      node_modules/pkg/file
      node_modules/pkg/file.css
      node_modules/pkg/file/package.json
      node_modules/pkg/file/main
      node_modules/pkg/file/main.css
      node_modules/pkg/file/main/index.css
      node_modules/pkg/file/index.css
      </pre>
      <p>
      Say the import `pkg/file` was ultimately resolved to the absolute path
      <code>node_modules/<wbr>pkg/<wbr>file/<wbr>index.css</code>. Even if you
      cache the contents of both the importing file and the imported file and
      verify that the contents of both files are still the same before reusing
      the cache entry, the cache entry could still be stale if one of the other
      files that `require.resolve()` checks for has either been created or deleted
      since the cache entry was added. Caching this correctly essentially involves
      always re-running all such path resolutions even when none of the input files
      have been changed and verifying that none of the path resolutions have
      changed either.
      </p>

    - >
      <p>
      These cache keys are only correct for an in-memory cache. It would be
      incorrect to implement a file system cache using the same cache keys.
      While an in-memory cache is guaranteed to always run the same code for
      every build because the code is also stored in memory, a file system
      cache could potentially be accessed by two separate builds that each
      contain different code. Specifically the code for the `slowTransform()`
      function may have been changed in between builds.
      </p>
      <p>
      This can happen in various cases. The package containing the function
      `slowTransform()` may have been updated, or one of its transitive
      dependencies may have been updated even if you have pinned the package's
      version due to how npm handles semver, or someone may have [mutated
      the package contents](https://www.npmjs.com/package/patch-package) on the
      file system in the meantime, or the transform function may be calling a
      node API and different builds could be running on different node versions.
      </p>
      <p>
      If you want to store your cache on the file system, you should guard
      against changes to the code for the transform function by storing some
      representation of the code for the transform function in the cache key.
      This is usually some form of [hash](https://nodejs.org/api/crypto.html#crypto_class_hash)
      that contains the contents of all relevant files in all relevant packages
      as well as potentially other details such as which node version you are
      currently running on. Getting all of this to be correct is non-trivial.
      </p>

  - h2#on-start: On-start callbacks

  - p: >
      Register an on-start callback to be notified when a new build starts. This
      triggers for all builds, not just the initial build, so it's especially
      useful for [rebuilds](/api/#rebuild), [watch mode](/api/#watch), and
      [serve mode](/api/#serve). Here's how to add an on-start callback:

  - example:
      mjs: |
        let examplePlugin = {
          name: 'example',
          setup(build) {
            build.onStart(() => {
              console.log('build started')
            })
          },
        }

      go: |
        package main

        import "fmt"
        import "github.com/evanw/esbuild/pkg/api"
        import "os"

        var examplePlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            build.OnStart(func() (api.OnStartResult, error) {
              fmt.Fprintf(os.Stderr, "build started\n")
              return api.OnStartResult{}, nil
            })
          },
        }

        func main() {
        }

  - p: >
      You should not use an on-start callback for initialization since it can be run
      multiple times. If you want to initialize something, just put your plugin
      initialization code directly inside the `setup` function instead.

  - p: >
      The on-start callback can be `async` and can return a promise. All on-start
      callbacks from all plugins are run concurrently, and then the build waits
      for all on-start callbacks to finish before proceeding. On-start callbacks
      can optionally return errors and/or warnings to be included with the build.

  - p: >
      Note that on-start callbacks do not have the ability to mutate the [build options](#build-options).
      The initial build options can only be modified within the `setup` function
      and are consumed once `setup` returns. All builds after the first one
      reuse the same initial options so the initial options are never re-consumed,
      and modifications to `build.initialOptions` that are done within the start
      callback are ignored.

  - h2#on-end: On-end callbacks

  - p: >
      Register an on-end callback to be notified when a new build ends. This
      triggers for all builds, not just the initial build, so it's especially
      useful for [rebuilds](/api/#rebuild), [watch mode](/api/#watch),
      and [serve mode](/api/#serve). Here's how to add an on-end callback:

  - example:
      mjs: |
        let examplePlugin = {
          name: 'example',
          setup(build) {
            build.onEnd(result => {
              console.log(`build ended with ${result.errors.length} errors`)
            })
          },
        }

      go: |
        package main

        import "fmt"
        import "github.com/evanw/esbuild/pkg/api"
        import "os"

        var examplePlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            build.OnEnd(func(result *api.BuildResult) (api.OnEndResult, error) {
              fmt.Fprintf(os.Stderr, "build ended with %d errors\n", len(result.Errors))
              return api.OnEndResult{}, nil
            })
          },
        }

        func main() {
        }

  - p: >
      All on-end callbacks are run in serial and each callback is given access to
      the final build result. It can modify the build result before returning
      and can delay the end of the build by returning a promise. If you want to
      be able to inspect the build graph, you should enable the [metafile](/api/#metafile)
      setting on the [initial options](#build-options) and the build graph will
      be returned as the `metafile` property on the build result object.

  - h2#on-dispose: On-dispose callbacks

  - p: >
      Register an on-dispose callback to perform cleanup when the plugin is no
      longer used. It will be called after every `build()` call regardless of
      whether the build failed or not, as well as after the first `dispose()`
      call on a given build context. Here's how to add an on-dispose callback:

  - example:
      mjs: |
        let examplePlugin = {
          name: 'example',
          setup(build) {
            build.onDispose(() => {
              console.log('This plugin is no longer used')
            })
          },
        }

      go: |
        package main

        import "fmt"
        import "github.com/evanw/esbuild/pkg/api"

        var examplePlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            build.OnDispose(func() {
              fmt.Println("This plugin is no longer used")
            })
          },
        }

        func main() {
        }

  - h2#build-options: Accessing build options

  - p: >
      Plugins can access the initial build options from within the `setup`
      method. This lets you inspect how the build is configured as well as
      modify the build options before the build starts. Here is an example:

  - example:
      mjs: |
        let examplePlugin = {
          name: 'auto-node-env',
          setup(build) {
            const options = build.initialOptions
            options.define = options.define || {}
            options.define['process.env.NODE_ENV'] =
              options.minify ? '"production"' : '"development"'
          },
        }

      go: |
        package main

        import "github.com/evanw/esbuild/pkg/api"

        var examplePlugin = api.Plugin{
          Name: "auto-node-env",
          Setup: func(build api.PluginBuild) {
            options := build.InitialOptions
            if options.Define == nil {
              options.Define = map[string]string{}
            }
            if options.MinifyWhitespace && options.MinifyIdentifiers && options.MinifySyntax {
              options.Define[`process.env.NODE_ENV`] = `"production"`
            } else {
              options.Define[`process.env.NODE_ENV`] = `"development"`
            }
          },
        }

        func main() {
        }

  - p: >
      Note that modifications to the build options after the build starts do
      not affect the build. In particular, [rebuilds](/api/#rebuild),
      [watch mode](/api/#watch), and [serve mode](/api/#serve) do not
      update their build options if plugins mutate the build options object
      after the first build has started.

  - h2#resolve: Resolving paths

  - p: >
      When a plugin returns a result from an [on-resolve callback](#on-resolve),
      the result completely replaces esbuild's built-in path resolution. This gives
      the plugin complete control over how path resolution works, but it means
      that the plugin may have to reimplement some of the behavior that esbuild
      already has built-in if it wants to have similar behavior. For example,
      a plugin may want to search for a package in the user's `node_modules`
      directory, which is something esbuild already implements.

  - p: >
      Instead of reimplementing esbuild's built-in behavior, plugins have the
      option of running esbuild's path resolution manually and inspecting the
      result. This lets you adjust the inputs and/or the outputs of esbuild's
      path resolution. Here's an example:

  - example:
      in:
        app.js: import 'example'
        bar/foo.js: console.log(123)

      mjs: |
        import * as esbuild from 'esbuild'

        let examplePlugin = {
          name: 'example',
          setup(build) {
            build.onResolve({ filter: /^example$/ }, async () => {
              const result = await build.resolve('./foo', {
                kind: 'import-statement',
                resolveDir: './bar',
              })
              if (result.errors.length > 0) {
                return { errors: result.errors }
              }
              return { path: result.path, external: true }
            })
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [examplePlugin],
        })

      go: |
        package main

        import "os"
        import "github.com/evanw/esbuild/pkg/api"

        var examplePlugin = api.Plugin{
          Name: "example",
          Setup: func(build api.PluginBuild) {
            build.OnResolve(api.OnResolveOptions{Filter: `^example$`},
              func(api.OnResolveArgs) (api.OnResolveResult, error) {
                result := build.Resolve("./foo", api.ResolveOptions{
                  Kind:       api.ResolveJSImportStatement,
                  ResolveDir: "./bar",
                })
                if len(result.Errors) > 0 {
                  return api.OnResolveResult{Errors: result.Errors}, nil
                }
                return api.OnResolveResult{Path: result.Path, External: true}, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{examplePlugin},
            Write:       true,
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      This plugin intercepts imports to the path `example`, tells esbuild to
      resolve the import `./foo` in the directory `./bar`, forces whatever
      path esbuild returns to be considered external, and maps the import for
      `example` to that external path.

  - p: >
      Here are some additional things to know about this API:

  - ul:
    - >
      <p>
      If you don't pass the optional `resolveDir` parameter, esbuild will still
      run `onResolve` plugin callbacks but will not attempt any path resolution
      itself. All of esbuild's path resolution logic depends on the `resolveDir`
      parameter including looking for packages in `node_modules` directories
      (since it needs to know where those `node_modules` directories might be).
      </p>

    - >
      <p>
      If you want to resolve a file name in a specific directory, make sure the
      input path starts with `./`. Otherwise the input path will be treated as
      a package path instead of a relative path. This behavior is identical to
      esbuild's normal path resolution logic.
      </p>

    - >
      <p>
      If path resolution fails, the `errors` property on the returned object
      will be a non-empty array containing the error information. This function
      does not always throw an error when it fails. You need to check for errors
      after calling it.
      </p>

    - >
      <p>
      The behavior of this function depends on the build configuration. That's
      why it's a property of the `build` object instead of being a top-level API
      call. This also means you can't call it until all plugin `setup` functions
      have finished since these give plugins the opportunity to adjust the build
      configuration before it's frozen at the start of the build. So the `resolve`
      function is going to be most useful inside your `onResolve` and/or `onLoad`
      callbacks.
      </p>

    - >
      <p>
      There is currently no attempt made to detect infinite path resolution loops.
      Calling `resolve` from within `onResolve` with the same parameters is almost
      certainly a bad idea.
      </p>

  - h3: Resolve options

  - p: >
      The `resolve` function takes the path to resolve as the first argument
      and an object with optional properties as the second argument. This
      options object is very similar to the [arguments that are passed to `onResolve`](#on-resolve-arguments).
      Here are the available options:

  - example:
      noCheck: true

      js: |
        interface ResolveOptions {
          kind: ResolveKind;
          importer?: string;
          namespace?: string;
          resolveDir?: string;
          pluginData?: any;
          with?: Record<string, string>;
        }

        type ResolveKind =
          | 'entry-point'
          | 'import-statement'
          | 'require-call'
          | 'dynamic-import'
          | 'require-resolve'
          | 'import-rule'
          | 'url-token'

      go: |
        type ResolveOptions struct {
          Kind       ResolveKind
          Importer   string
          Namespace  string
          ResolveDir string
          PluginData interface{}
          With       map[string]string
        }

        const (
          ResolveEntryPoint        ResolveKind
          ResolveJSImportStatement ResolveKind
          ResolveJSRequireCall     ResolveKind
          ResolveJSDynamicImport   ResolveKind
          ResolveJSRequireResolve  ResolveKind
          ResolveCSSImportRule     ResolveKind
          ResolveCSSURLToken       ResolveKind
        )

  - ul:
    - >
      `kind`
      <p>
      This tells esbuild how the path was imported, which can affect path
      resolution. For example, [node's path resolution rules](https://nodejs.org/api/packages.html#conditional-exports)
      say that paths imported using `'require-call'` should respect [conditional
      package imports](/api/#conditions) in the `"require"` section in `package.json` while paths
      imported using `'import-statement'` should respect conditional package
      imports in the `"import"` section instead.
      </p>

    - >
      `importer`
      <p>
      If set, this is interpreted as the path of the module containing this
      import to be resolved. This affects plugins with `onResolve` callbacks
      that check the `importer` value.
      </p>

    - >
      `namespace`
      <p>
      If set, this is interpreted as the namespace of the module containing this
      import to be resolved. This affects plugins with `onResolve` callbacks
      that check the `namespace` value. You can read more about namespaces
      [here](#namespaces).
      </p>

    - >
      `resolveDir`
      <p>
      This is the file system directory to use when resolving an import path
      to a real path on the file system. This must be set for esbuild's built-in
      path resolution to be able to find a given file, even for non-relative
      package paths (since esbuild needs to know where the `node_modules`
      directory is).
      </p>

    - >
      `pluginData`
      <p>
      This property can be used to pass custom data to whatever [on-resolve callbacks](#on-resolve)
      match this import path. The meaning of this data is left entirely up to you.
      </p>

    - >
      `with`
      <p>
      This is the [import attributes](https://github.com/tc39/proposal-import-attributes)
      assocated with the import statement for this path. For example, a `with` value of
      <code>{ type: <wbr>'json' }</code> would be appropriate for a module imported using
      <code>with { <wbr>type: <wbr>'json' }</code> attributes on the import statement.
      This information isn't used by esbuild but may be used by [on-resolve callbacks](#on-resolve).
      </p>

  - h3: Resolve results

  - p: >
      The `resolve` function returns an object that's very similar to what
      plugins can [return from an `onResolve` callback](#on-resolve-results).
      It has the following properties:

  - example:
      noCheck: true

      js: |
        export interface ResolveResult {
          errors: Message[];
          external: boolean;
          namespace: string;
          path: string;
          pluginData: any;
          sideEffects: boolean;
          suffix: string;
          warnings: Message[];
        }

        interface Message {
          text: string;
          location: Location | null;
          detail: any; // The original error from a JavaScript plugin, if applicable
        }

        interface Location {
          file: string;
          namespace: string;
          line: number; // 1-based
          column: number; // 0-based, in bytes
          length: number; // in bytes
          lineText: string;
        }

      go: |
        type ResolveResult struct {
          Errors      []Message
          External    bool
          Namespace   string
          Path        string
          PluginData  interface{}
          SideEffects bool
          Suffix      string
          Warnings    []Message
        }

        type Message struct {
          Text     string
          Location *Location
          Detail   interface{} // The original error from a Go plugin, if applicable
        }

        type Location struct {
          File      string
          Namespace string
          Line      int // 1-based
          Column    int // 0-based, in bytes
          Length    int // in bytes
          LineText  string
        }

  - ul:
    - >
      `path`
      <p>
      This is the result of path resolution, or an empty string if path
      resolution failed.
      </p>

    - >
      `external`
      <p>
      This will be `true` if the path was marked as [external](/api/#external), which
      means it will not be included in the bundle and will instead be imported
      at run-time.
      </p>

    - >
      `namespace`
      <p>
      This is the namespace associated with the resolved path. You can read
      more about namespaces [here](#namespaces).
      </p>

    - >
      `errors` and `warnings`
      <p>
      These properties hold any log messages generated during path resolution,
      either by any plugins that responded to this path resolution operation
      or by esbuild itself. These log messages are not automatically included
      in the log, so they will be completely invisible if you discard them.
      If you want them to be included in the log, you'll need to return them
      from either `onResolve` or `onLoad`.
      </p>

    - >
      `pluginData`
      <p>
      If a plugin responded to this path resolution operation and returned
      `pluginData` from its `onResolve` callback, that data will end up here.
      This is useful to pass data between different plugins without them
      having to coordinate directly.
      </p>

    - >
      `sideEffects`
      <p>
      This property will be `true` unless the module is somehow annotated as
      having no side effects, in which case it will be `false`. This will be
      `false` for packages that have `"sideEffects": false` in the corresponding
      `package.json` file, and also if a plugin responds to this path resolution
      operation and returns `sideEffects: false`. You can read more about what
      `sideEffects` means in [Webpack's documentation about the feature](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free).
      </p>

    - >
      `suffix`
      <p>
      This can contain an optional URL query or hash if there was one at the
      end of the path to be resolved and if removing it was required for the
      path to resolve successfully.
      </p>

  - h2: Example plugins

  - p: >
      The example plugins below are meant to give you an idea of the
      different types of things you can do with the plugin API.

  - h3: HTTP plugin

  - p: >
      _This example demonstrates: using a path format other than file system
      paths, namespace-specific path resolution, using resolve and load
      callbacks together._

  - p: >
      This plugin allows you to import HTTP URLs into JavaScript code. The
      code will automatically be downloaded at build time. It enables the
      following workflow:

  - pre.js: |
      import { zip } from 'https://unpkg.com/lodash-es@4.17.15/lodash.js'
      console.log(zip([1, 2], ['a', 'b']))

  - p: >
      This can be accomplished with the following plugin. Note that for real
      usage the downloads should be cached, but caching has been omitted from
      this example for brevity:

  - example:
      in:
        app.js: |
          // This example is different from the example above because the "pick"
          // file only has one import, and that imported file has no imports.
          // This means we can actually run this example in CI without too much
          // of a slowdown.
          import { pick } from 'https://unpkg.com/remeda@0.0.23/dist/es/pick.js'
          console.log(pick({a: 1, b: 2}, ['a']))

      mjs: |
        import * as esbuild from 'esbuild'
        import https from 'node:https'
        import http from 'node:http'

        let httpPlugin = {
          name: 'http',
          setup(build) {
            // Intercept import paths starting with "http:" and "https:" so
            // esbuild doesn't attempt to map them to a file system location.
            // Tag them with the "http-url" namespace to associate them with
            // this plugin.
            build.onResolve({ filter: /^https?:\/\// }, args => ({
              path: args.path,
              namespace: 'http-url',
            }))

            // We also want to intercept all import paths inside downloaded
            // files and resolve them against the original URL. All of these
            // files will be in the "http-url" namespace. Make sure to keep
            // the newly resolved URL in the "http-url" namespace so imports
            // inside it will also be resolved as URLs recursively.
            build.onResolve({ filter: /.*/, namespace: 'http-url' }, args => ({
              path: new URL(args.path, args.importer).toString(),
              namespace: 'http-url',
            }))

            // When a URL is loaded, we want to actually download the content
            // from the internet. This has just enough logic to be able to
            // handle the example import from unpkg.com but in reality this
            // would probably need to be more complex.
            build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
              let contents = await new Promise((resolve, reject) => {
                function fetch(url) {
                  console.log(`Downloading: ${url}`)
                  let lib = url.startsWith('https') ? https : http
                  let req = lib.get(url, res => {
                    if ([301, 302, 307].includes(res.statusCode)) {
                      fetch(new URL(res.headers.location, url).toString())
                      req.abort()
                    } else if (res.statusCode === 200) {
                      let chunks = []
                      res.on('data', chunk => chunks.push(chunk))
                      res.on('end', () => resolve(Buffer.concat(chunks)))
                    } else {
                      reject(new Error(`GET ${url} failed: status ${res.statusCode}`))
                    }
                  }).on('error', reject)
                }
                fetch(args.path)
              })
              return { contents }
            })
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [httpPlugin],
        })

      go: |
        package main

        import "io/ioutil"
        import "net/http"
        import "net/url"
        import "os"
        import "github.com/evanw/esbuild/pkg/api"

        var httpPlugin = api.Plugin{
          Name: "http",
          Setup: func(build api.PluginBuild) {
            // Intercept import paths starting with "http:" and "https:" so
            // esbuild doesn't attempt to map them to a file system location.
            // Tag them with the "http-url" namespace to associate them with
            // this plugin.
            build.OnResolve(api.OnResolveOptions{Filter: `^https?://`},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                return api.OnResolveResult{
                  Path:      args.Path,
                  Namespace: "http-url",
                }, nil
              })

            // We also want to intercept all import paths inside downloaded
            // files and resolve them against the original URL. All of these
            // files will be in the "http-url" namespace. Make sure to keep
            // the newly resolved URL in the "http-url" namespace so imports
            // inside it will also be resolved as URLs recursively.
            build.OnResolve(api.OnResolveOptions{Filter: ".*", Namespace: "http-url"},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                base, err := url.Parse(args.Importer)
                if err != nil {
                  return api.OnResolveResult{}, err
                }
                relative, err := url.Parse(args.Path)
                if err != nil {
                  return api.OnResolveResult{}, err
                }
                return api.OnResolveResult{
                  Path:      base.ResolveReference(relative).String(),
                  Namespace: "http-url",
                }, nil
              })

            // When a URL is loaded, we want to actually download the content
            // from the internet. This has just enough logic to be able to
            // handle the example import from unpkg.com but in reality this
            // would probably need to be more complex.
            build.OnLoad(api.OnLoadOptions{Filter: ".*", Namespace: "http-url"},
              func(args api.OnLoadArgs) (api.OnLoadResult, error) {
                res, err := http.Get(args.Path)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                defer res.Body.Close()
                bytes, err := ioutil.ReadAll(res.Body)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                contents := string(bytes)
                return api.OnLoadResult{Contents: &contents}, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{httpPlugin},
            Write:       true,
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      The plugin first uses a resolver to move `http://` and `https://` URLs to
      the `http-url` namespace. Setting the namespace tells esbuild to not treat
      these paths as file system paths. Then, a loader for the `http-url` namespace
      downloads the module and returns the contents to esbuild. From there,
      another resolver for import paths inside modules in the `http-url` namespace
      picks up relative paths and translates them into full URLs by resolving
      them against the importing module's URL. That then feeds back into the
      loader allowing downloaded modules to download additional modules recursively.

  - h3: WebAssembly plugin

  - p: >
      _This example demonstrates: working with binary data, creating
      virtual modules using import statements, re-using the same path with
      different namespaces._

  - p: >
      This plugin allows you to import `.wasm` files into JavaScript code. It
      does not generate the WebAssembly files themselves; that can either be
      done by another tool or by modifying this example plugin to suit your
      needs. It enables the following workflow:

  - pre.js: |
      import load from './example.wasm'
      load(imports).then(exports => { ... })

  - p: >
      When you import a `.wasm` file, this plugin generates a virtual JavaScript
      module in the `wasm-stub` namespace with a single function that loads the
      WebAssembly module exported as the default export. That stub module looks
      something like this:

  - pre.js: |
      import wasm from '/path/to/example.wasm'
      export default (imports) =>
        WebAssembly.instantiate(wasm, imports).then(
          result => result.instance.exports)

  - p: >
      Then that stub module imports the WebAssembly file itself as another
      module in the `wasm-binary` namespace using esbuild's built-in
      [binary](/content-types/#binary) loader. This means importing a `.wasm`
      file actually generates two virtual modules. Here's the code for the
      plugin:

  - example:
      in:
        app.js: |
          import load from './example.wasm'
          load(imports).then(exports => { /* ... */ })
        example.wasm: |
          this is an example wasm file

      mjs: |
        import * as esbuild from 'esbuild'
        import path from 'node:path'
        import fs from 'node:fs'

        let wasmPlugin = {
          name: 'wasm',
          setup(build) {
            // Resolve ".wasm" files to a path with a namespace
            build.onResolve({ filter: /\.wasm$/ }, args => {
              // If this is the import inside the stub module, import the
              // binary itself. Put the path in the "wasm-binary" namespace
              // to tell our binary load callback to load the binary file.
              if (args.namespace === 'wasm-stub') {
                return {
                  path: args.path,
                  namespace: 'wasm-binary',
                }
              }

              // Otherwise, generate the JavaScript stub module for this
              // ".wasm" file. Put it in the "wasm-stub" namespace to tell
              // our stub load callback to fill it with JavaScript.
              //
              // Resolve relative paths to absolute paths here since this
              // resolve callback is given "resolveDir", the directory to
              // resolve imports against.
              if (args.resolveDir === '') {
                return // Ignore unresolvable paths
              }
              return {
                path: path.isAbsolute(args.path) ? args.path : path.join(args.resolveDir, args.path),
                namespace: 'wasm-stub',
              }
            })

            // Virtual modules in the "wasm-stub" namespace are filled with
            // the JavaScript code for compiling the WebAssembly binary. The
            // binary itself is imported from a second virtual module.
            build.onLoad({ filter: /.*/, namespace: 'wasm-stub' }, async (args) => ({
              contents: `import wasm from ${JSON.stringify(args.path)}
                export default (imports) =>
                  WebAssembly.instantiate(wasm, imports).then(
                    result => result.instance.exports)`,
            }))

            // Virtual modules in the "wasm-binary" namespace contain the
            // actual bytes of the WebAssembly file. This uses esbuild's
            // built-in "binary" loader instead of manually embedding the
            // binary data inside JavaScript code ourselves.
            build.onLoad({ filter: /.*/, namespace: 'wasm-binary' }, async (args) => ({
              contents: await fs.promises.readFile(args.path),
              loader: 'binary',
            }))
          },
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [wasmPlugin],
        })

      go: |
        package main

        import "encoding/json"
        import "io/ioutil"
        import "os"
        import "path/filepath"
        import "github.com/evanw/esbuild/pkg/api"

        var wasmPlugin = api.Plugin{
          Name: "wasm",
          Setup: func(build api.PluginBuild) {
            // Resolve ".wasm" files to a path with a namespace
            build.OnResolve(api.OnResolveOptions{Filter: `\.wasm$`},
              func(args api.OnResolveArgs) (api.OnResolveResult, error) {
                // If this is the import inside the stub module, import the
                // binary itself. Put the path in the "wasm-binary" namespace
                // to tell our binary load callback to load the binary file.
                if args.Namespace == "wasm-stub" {
                  return api.OnResolveResult{
                    Path:      args.Path,
                    Namespace: "wasm-binary",
                  }, nil
                }

                // Otherwise, generate the JavaScript stub module for this
                // ".wasm" file. Put it in the "wasm-stub" namespace to tell
                // our stub load callback to fill it with JavaScript.
                //
                // Resolve relative paths to absolute paths here since this
                // resolve callback is given "resolveDir", the directory to
                // resolve imports against.
                if args.ResolveDir == "" {
                  return api.OnResolveResult{}, nil // Ignore unresolvable paths
                }
                if !filepath.IsAbs(args.Path) {
                  args.Path = filepath.Join(args.ResolveDir, args.Path)
                }
                return api.OnResolveResult{
                  Path:      args.Path,
                  Namespace: "wasm-stub",
                }, nil
              })

            // Virtual modules in the "wasm-stub" namespace are filled with
            // the JavaScript code for compiling the WebAssembly binary. The
            // binary itself is imported from a second virtual module.
            build.OnLoad(api.OnLoadOptions{Filter: `.*`, Namespace: "wasm-stub"},
              func(args api.OnLoadArgs) (api.OnLoadResult, error) {
                bytes, err := json.Marshal(args.Path)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                contents := `import wasm from ` + string(bytes) + `
                  export default (imports) =>
                    WebAssembly.instantiate(wasm, imports).then(
                      result => result.instance.exports)`
                return api.OnLoadResult{Contents: &contents}, nil
              })

            // Virtual modules in the "wasm-binary" namespace contain the
            // actual bytes of the WebAssembly file. This uses esbuild's
            // built-in "binary" loader instead of manually embedding the
            // binary data inside JavaScript code ourselves.
            build.OnLoad(api.OnLoadOptions{Filter: `.*`, Namespace: "wasm-binary"},
              func(args api.OnLoadArgs) (api.OnLoadResult, error) {
                bytes, err := ioutil.ReadFile(args.Path)
                if err != nil {
                  return api.OnLoadResult{}, err
                }
                contents := string(bytes)
                return api.OnLoadResult{
                  Contents: &contents,
                  Loader:   api.LoaderBinary,
                }, nil
              })
          },
        }

        func main() {
          result := api.Build(api.BuildOptions{
            EntryPoints: []string{"app.js"},
            Bundle:      true,
            Outfile:     "out.js",
            Plugins:     []api.Plugin{wasmPlugin},
            Write:       true,
          })

          if len(result.Errors) > 0 {
            os.Exit(1)
          }
        }

  - p: >
      The plugin works in multiple steps. First, a resolve callback captures
      `.wasm` paths in normal modules and moves them to the `wasm-stub`
      namespace. Then load callback for the `wasm-stub` namespace generates a
      JavaScript stub module that exports the loader function and imports the
      `.wasm` path. This invokes the resolve callback again which this time
      moves the path to the `wasm-binary` namespace. Then the second load
      callback for the `wasm-binary` namespace causes the WebAssembly file to
      be loaded using the `binary` loader, which tells esbuild to embed the
      file itself in the bundle.

  - h3: Svelte plugin

  - p: >
      _This example demonstrates: supporting a compile-to-JavaScript language,
      reporting warnings and errors, integrating source maps._

  - p: >
      This plugin allows you to bundle `.svelte` files, which are from the
      [Svelte](https://svelte.dev/) framework. You write code in an HTML-like
      syntax that is then converted to JavaScript by the Svelte compiler.
      Svelte code looks something like this:

  - pre.html: |
      <script>
        let a = 1;
        let b = 2;
      </script>
      <input type="number" bind:value={a}>
      <input type="number" bind:value={b}>
      <p>{a} + {b} = {a + b}</p>

  - p: >
      Compiling this code with the Svelte compiler generates a JavaScript
      module that depends on the `svelte/internal` package and that exports
      the component as a a single class using the `default` export. This
      means `.svelte` files can be compiled independently, which makes Svelte
      a good fit for an esbuild plugin. This plugin is triggered by importing
      a `.svelte` file like this:

  - pre.js: |
      import Button from './button.svelte'

  - p: >
      Here's the code for the plugin (there is no Go version of this plugin
      because the Svelte compiler is written in JavaScript):

  - example:
      install:
        svelte: '4.0.5'

      in:
        app.js: |
          import Button from './button.svelte'
        button.svelte: |
          <script>
            let a = 1;
            let b = 2;
          </script>
          <input type="number" bind:value={a}>
          <input type="number" bind:value={b}>
          <p>{a} + {b} = {a + b}</p>

      mjs: |
        import * as esbuild from 'esbuild'
        import * as svelte from 'svelte/compiler'
        import path from 'node:path'
        import fs from 'node:fs'

        let sveltePlugin = {
          name: 'svelte',
          setup(build) {
            build.onLoad({ filter: /\.svelte$/ }, async (args) => {
              // This converts a message in Svelte's format to esbuild's format
              let convertMessage = ({ message, start, end }) => {
                let location
                if (start && end) {
                  let lineText = source.split(/\r\n|\r|\n/g)[start.line - 1]
                  let lineEnd = start.line === end.line ? end.column : lineText.length
                  location = {
                    file: filename,
                    line: start.line,
                    column: start.column,
                    length: lineEnd - start.column,
                    lineText,
                  }
                }
                return { text: message, location }
              }

              // Load the file from the file system
              let source = await fs.promises.readFile(args.path, 'utf8')
              let filename = path.relative(process.cwd(), args.path)

              // Convert Svelte syntax to JavaScript
              try {
                let { js, warnings } = svelte.compile(source, { filename })
                let contents = js.code + `//# sourceMappingURL=` + js.map.toUrl()
                return { contents, warnings: warnings.map(convertMessage) }
              } catch (e) {
                return { errors: [convertMessage(e)] }
              }
            })
          }
        }

        await esbuild.build({
          entryPoints: ['app.js'],
          bundle: true,
          outfile: 'out.js',
          plugins: [sveltePlugin],
        })

  - p: >
      This plugin only needs a load callback, not a resolve callback, because
      it's simple enough that it just needs to transform the loaded code into
      JavaScript without worrying about where the code comes from.

  - p: >
      It appends a `//# sourceMappingURL=` comment to the generated JavaScript
      to tell esbuild how to map the generated JavaScript back to the original
      source code. If source maps are enabled during the build, esbuild will
      use this to ensure that the generated positions in the final source map
      are mapped all the way back to the original Svelte file instead of to
      the intermediate JavaScript code.

  - h2: Plugin API limitations

  - p: >
      This API does not intend to cover all use cases. It's not possible to
      hook into every part of the bundling process. For example, it's not
      currently possible to modify the AST directly. This restriction exists
      to preserve the excellent performance characteristics of esbuild as well
      as to avoid exposing too much API surface which would be a maintenance
      burden and would prevent improvements that involve changing the AST.

  - p: >
      One way to think about esbuild is as a "linker" for the web. Just like
      a linker for native code, esbuild's job is to take a set of files,
      resolve and bind references between them, and generate a single file
      containing all of the code linked together. A plugin's job is to
      generate the individual files that end up being linked.

  - p: >
      Plugins in esbuild work best when they are relatively scoped and only
      customize a small aspect of the build. For example, a plugin for a
      special configuration file in a custom format (e.g. YAML) is very
      appropriate. The more plugins you use, the slower your build will get,
      especially if your plugin is written in JavaScript. If a plugin applies
      to every file in your build, then your build will likely be very slow.
      If caching is applicable, it must be done by the plugin itself.
