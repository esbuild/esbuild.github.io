(() => {
  var doc = document
  var body = doc.body
  var docElem = doc.documentElement
  var docElemDataset = docElem.dataset
  var bodyDataset = body.dataset
  var getElementById = doc.getElementById.bind(doc)
  var os = navigator.platform === 'Win32' ? 'windows' : 'unix'

  try {
    bodyDataset.mode3 = localStorage.getItem('mode3') || 'cli'
    bodyDataset.mode2 = localStorage.getItem('mode2') || 'js'
    bodyDataset.os2 = localStorage.getItem('os2') || os
    docElemDataset.theme = localStorage.getItem('theme')
  } catch (e) {
    bodyDataset.mode3 = 'cli'
    bodyDataset.mode2 = 'js'
    bodyDataset.os2 = os
    docElemDataset.theme = null
  }

  body.classList.add('has-js')

  addEventListener('click', e => {
    if (e.target.parentElement && e.target.parentElement.className === 'switcher') {
      var target = e.target.className

      if (/^(cli|js|go)[23]$/.test(target)) {
        var before = e.target.offsetTop - docElem.scrollTop

        for (var i = target === 'cli3' ? 3 : 2; i <= 3; i++) {
          bodyDataset['mode' + i] = target.slice(0, -1)
          localStorage.setItem('mode' + i, target.slice(0, -1))
        }

        var after = e.target.offsetTop - docElem.scrollTop
        docElem.scrollTop += after - before
      }

      if (/^(unix|windows)2$/.test(target)) {
        var before = e.target.offsetTop - docElem.scrollTop

        bodyDataset['os2'] = target.slice(0, -1)
        localStorage.setItem('os2', target.slice(0, -1))

        var after = e.target.offsetTop - docElem.scrollTop
        docElem.scrollTop += after - before
      }
    }
  })

  addEventListener('DOMContentLoaded', () => {
    function updateNav() {
      var h2, h3, h4

      for (var i = 0; i < headers.length; i++) {
        var h = headers[i]
        if (h.getBoundingClientRect().top > 10) break
        if (h.tagName === 'H2') {
          h2 = h
          h3 = h4 = null
        } else if (h.tagName === 'H3') {
          h3 = h
          h4 = null
        } else {
          h4 = h
        }
      }

      for (var i = 0; i < headers.length; i++) {
        var h = headers[i]
        if (h.tagName === 'H4') continue
        getElementById('nav-' + h.id).classList.toggle('current', h === (h3 || h2))
      }

      // Throttle to avoid crashes in Safari
      var h = h4 || h3 || h2
      pathhash = location.pathname + (h ? '#' + h.id : '')
      if (throttle === null) throttle = setTimeout(updatePathname, 300)
    }

    function updatePathname() {
      throttle = null
      if (location.pathname + location.hash !== pathhash) {
        history.replaceState(null, '', pathhash)
      }
    }

    var menutoggle = getElementById('menutoggle')
    var shadow = getElementById('shadow')
    var menu = getElementById('menu')
    var nav = doc.querySelector('nav')

    menutoggle.addEventListener('click', function () {
      menu.scrollTop = 0
      nav.classList.add('open')
    })

    shadow.addEventListener('click', function (e) {
      nav.classList.remove('open')
    })

    var pathhash
    var throttle = null
    var headers = doc.querySelectorAll('h2,h3,h4')

    addEventListener('scroll', updateNav, { passive: true })
    addEventListener('load', updateNav)

    function inverseSystemTheme() {
      return darkMedia.matches ? 'light' : 'dark'
    }

    function updateTheme(theme) {
      localStorage.setItem('theme', theme)
      docElemDataset.theme = theme
    }

    // Handle updates from other tabs
    addEventListener('storage', () => {
      docElemDataset.theme = localStorage.getItem('theme')
    })

    getElementById('theme').addEventListener('click', function () {
      var theme = inverseSystemTheme()
      updateTheme(docElemDataset.theme === theme ? null : theme)
    })

    var darkMedia = matchMedia('(prefers-color-scheme: dark)')

    function onDarkModeChange() {
      if (docElemDataset.theme !== inverseSystemTheme()) {
        updateTheme(null)
      }
    }

    try {
      // Newer browsers
      darkMedia.addEventListener('change', onDarkModeChange)
    } catch (e) {
      // Older browsers
      darkMedia.addListener(onDarkModeChange)
    }
  })
})()
