addEventListener('click', function (e) {
  if (e.target.parentElement && e.target.parentElement.className === 'switcher') {
    var target = e.target.className

    if (/^(cli|js|go)[23]$/.test(target)) {
      var before = e.target.offsetTop - document.body.scrollTop

      for (var i = target === 'cli3' ? 3 : 2; i <= 3; i++) {
        document.body.dataset['mode' + i] = target.slice(0, -1)
        localStorage.setItem('mode' + i, target.slice(0, -1))
      }

      var after = e.target.offsetTop - document.body.scrollTop
      document.body.scrollTop += after - before
    }

    if (/^(unix|windows)2$/.test(target)) {
      var before = e.target.offsetTop - document.body.scrollTop

      document.body.dataset['os2'] = target.slice(0, -1)
      localStorage.setItem('os2', target.slice(0, -1))

      var after = e.target.offsetTop - document.body.scrollTop
      document.body.scrollTop += after - before
    }
  }
})

addEventListener('DOMContentLoaded', function () {
  function updateNav() {
    var h2, h3, h4

    for (var i = 0; i < headers.length; i++) {
      var h = headers[i]
      if (h.getBoundingClientRect().top > 10) break
      if (h.dataset.h3) {
        h2 = document.getElementById(h.dataset.h2)
        h3 = document.getElementById(h.dataset.h3)
        h4 = h
      } else if (h.dataset.h2) {
        h2 = document.getElementById(h.dataset.h2)
        h3 = h
        h4 = null
      } else {
        h2 = h
        h3 = null
        h4 = null
      }
    }

    for (var i = 0; i < headers.length; i++) {
      var h = headers[i]
      if (h.tagName === 'H4') continue
      document.getElementById('nav-' + h.id).classList.toggle('current', h === (h3 || h2))
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

  var menutoggle = document.getElementById('menutoggle')
  var shadow = document.getElementById('shadow')
  var menu = document.getElementById('menu')
  var nav = document.querySelector('nav')

  menutoggle.addEventListener('click', function () {
    menu.scrollTop = 0
    nav.classList.add('open')
  })

  shadow.addEventListener('click', function (e) {
    nav.classList.remove('open')
  })

  var pathhash
  var throttle = null
  var headers = document.querySelectorAll('h2, h3, h4')

  addEventListener('scroll', updateNav, { passive: true })
  addEventListener('load', updateNav)

  function inverseSystemTheme() {
    return darkMedia.matches ? 'light' : 'dark'
  }

  function updateTheme(theme) {
    localStorage.setItem('theme', theme)
    document.body.dataset.theme = theme
  }

  // Handle updates from other tabs
  addEventListener('storage', () => {
    document.body.dataset.theme = localStorage.getItem('theme')
  })

  document.getElementById('theme').addEventListener('click', function () {
    var theme = inverseSystemTheme()
    updateTheme(document.body.dataset.theme === theme ? null : theme)
  })

  var darkMedia = matchMedia('(prefers-color-scheme: dark)')

  function onDarkModeChange() {
    if (document.body.dataset.theme !== inverseSystemTheme()) {
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
