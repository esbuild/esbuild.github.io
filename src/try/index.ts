import './index.css'
import './live-reload'
import { loadStateFromHash } from './share'
import { tryToSetCurrentVersion } from './versions'

if (!loadStateFromHash()) tryToSetCurrentVersion('latest')
