// This file manages the UI for the version picker in the top right corner

const versionsPromise = tryToFetchVersions()
const versionPickerEl = document.querySelector('#versionPicker select') as HTMLSelectElement
const loading = document.createElement('option')

export type Semver = `${number}.${number}.${number}`
export type Version = 'pkgurl' | Semver
export type ReloadWorker = (version: Version) => Promise<Worker>
let reloadWorker: ReloadWorker

loading.textContent = 'Loading...'
versionPickerEl.append(loading)
versionPickerEl.disabled = true

versionsPromise.then(result => {
  // The browser API started working in version 0.5.1, so remove all versions before that
  const versions = result.filter(version => !/^0\.[0-4]\.|^0\.5\.0/.test(version))
  versionPickerEl.disabled = false
  loading.remove()
  for (const version of versions) {
    const option = document.createElement('option')
    option.textContent = version
    versionPickerEl.append(option)
  }
  versionPickerEl.onchange = () => reloadWorker(versionPickerEl.value as Semver)
  versionPickerEl.selectedIndex = -1
}, () => {
  loading.textContent = '❌ Loading failed!'
})

export function tryToGetCurrentVersion(): Version | null {
  return versionPickerEl.disabled ? null : versionPickerEl.selectedIndex < 0 ? 'pkgurl' : versionPickerEl.value as Semver
}

export function setReloadWorkerCallback(callback: ReloadWorker): void {
  reloadWorker = callback
}

export async function tryToSetCurrentVersion(version: Version | 'latest'): Promise<void> {
  if (version === 'pkgurl') {
    if (versionPickerEl.selectedIndex !== -1) {
      versionPickerEl.selectedIndex = -1
      await reloadWorker('pkgurl')
    }
  } else {
    const versions = await versionsPromise
    const index = version === 'latest' ? versions.length ? 0 : -1 : versions.indexOf(version)
    if (index >= 0 && versionPickerEl.selectedIndex !== index) {
      versionPickerEl.selectedIndex = index
      await reloadWorker(versions[index])
    }
  }
}

async function tryToFetchVersions(): Promise<Semver[]> {
  const controller = new AbortController
  const timeout = setTimeout(() => controller.abort('Timeout'), 5000)

  // This is probably faster than the registry because it returns less data
  try {
    const url = 'https://data.jsdelivr.com/v1/package/npm/esbuild-wasm'
    const response = await fetch(url, { signal: controller.signal })
    if (response && response.ok) {
      clearTimeout(timeout)
      const versions = (await response.json()).versions
      if (versions && versions.length) {
        console.log(`Loaded ${versions.length} versions from ${url}`)
        return versions
      }
    }
  } catch (err) {
    console.error(err)
  }

  // Fall back to the npm registry if that service is down
  try {
    const url = 'https://registry.npmjs.org/esbuild-wasm'
    let versions = (await fetch(url).then(r => r.json())).versions
    if (versions) {
      versions = Object.keys(versions).reverse()
      if (versions.length) {
        console.log(`Loaded ${versions.length} versions from ${url}`)
        return versions
      }
    }
  } catch (err) {
    console.error(err)
  }

  throw new Error
}
