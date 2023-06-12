import './index.css'
import './live-reload'
import { pkgurlParam } from './ipc'
import { loadStateFromHash } from './share'
import { tryToSetCurrentVersion } from './versions'

if (!loadStateFromHash()) tryToSetCurrentVersion(pkgurlParam ? 'pkgurl' : 'latest')
