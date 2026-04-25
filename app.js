(function () {
  'use strict';

  var MD_FILE = 'Introduce.md';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatInline(s) {
    if (!s) {
      return '';
    }
    var t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, function (_m, c) {
      return '<code>' + c + '</code>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return t;
  }

  function findH2Boundaries(lines) {
    var idx = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('## ') === 0 && lines[i].indexOf('### ') !== 0) {
        idx.push(i);
      }
    }
    return idx;
  }

  function isTableLine(line) {
    var t = (line || '').trim();
    return t.charAt(0) === '|' && t.indexOf('|', 1) !== -1;
  }

  function isTableSeparator(line) {
    var t = (line || '').trim();
    return /^\|?[\s\-:|]+\|?$/.test(t) && t.replace(/[\s\-:|]/g, '') === '';
  }

  function renderTable(lines, i, end) {
    var rows = [];
    var j = i;
    while (j < end && isTableLine(lines[j])) {
      var row = lines[j].trim();
      if (isTableSeparator(row)) {
        j++;
        continue;
      }
      var cells = row
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(function (c) {
          return c.trim();
        });
      rows.push(cells);
      j++;
    }
    if (rows.length === 0) {
      return { html: '', next: i + 1 };
    }
    var thead = rows[0]
      ? '<thead><tr>' +
        rows[0]
          .map(function (c) {
            return '<th scope="col">' + formatInline(c) + '</th>';
          })
          .join('') +
        '</tr></thead>'
      : '';
    var tbody =
      rows.length > 1
        ? '<tbody>' +
          rows
            .slice(1)
            .map(function (r) {
              return (
                '<tr>' +
                r
                  .map(function (c) {
                    return '<td>' + formatInline(c) + '</td>';
                  })
                  .join('') +
                '</tr>'
              );
            })
            .join('') +
          '</tbody>'
        : '';
    return {
      html: '<div class="table-wrap"><table class="data-table">' + thead + tbody + '</table></div>',
      next: j
    };
  }

  function renderListOrdered(lines, i, end) {
    var items = [];
    var j = i;
    while (j < end) {
      var L = lines[j];
      var m = L.match(/^(\d+)\.\s+(.*)$/);
      if (!m) {
        if (/^\s{2,}\S/.test(L) && items.length) {
          items[items.length - 1] = items[items.length - 1] + ' ' + L.trim();
          j++;
          continue;
        }
        break;
      }
      var text = m[2];
      j++;
      while (j < end) {
        var C = lines[j];
        if (C.indexOf('## ') === 0 || C.indexOf('### ') === 0) {
          break;
        }
        if (/^\d+\.\s+/.test(C)) {
          break;
        }
        if (C.trim() === '' && j + 1 < end && /^\d+\.\s+/.test(lines[j + 1])) {
          j++;
          break;
        }
        if (C.trim() === '') {
          j++;
          continue;
        }
        if (/^  +/.test(C) && !/^\d+\./.test(C) && C.indexOf('- ') !== 0) {
          text += ' ' + C.trim();
          j++;
          continue;
        }
        if (!/^\d+\./.test(C) && C.indexOf('- ') !== 0 && !isTableLine(C) && C.indexOf('> ') !== 0) {
          if (C.indexOf('##') === 0) {
            break;
          }
          text += ' ' + C.trim();
          j++;
          continue;
        }
        break;
      }
      items.push(text);
    }
    return {
      html:
        '<ol class="prose-ol">' +
        items
          .map(function (t) {
            return '<li>' + formatInline(t) + '</li>';
          })
          .join('') +
        '</ol>',
      next: j
    };
  }

  function renderListUnordered(lines, i, end) {
    var items = [];
    var j = i;
    while (j < end) {
      var L = lines[j];
      if (L.indexOf('- ') !== 0) {
        if (/^  +/.test(L) && items.length) {
          items[items.length - 1] = items[items.length - 1] + ' ' + L.trim();
          j++;
          continue;
        }
        break;
      }
      var text = L.slice(2);
      j++;
      while (j < end) {
        var C = lines[j];
        if (C.indexOf('- ') === 0) {
          break;
        }
        if (C.indexOf('## ') === 0 || C.indexOf('### ') === 0) {
          break;
        }
        if (C === '---') {
          break;
        }
        if (C.trim() === '') {
          j++;
          continue;
        }
        if (C.indexOf('> ') === 0 || isTableLine(C) || /^\d+\.\s+/.test(C)) {
          break;
        }
        if (C.indexOf('## ') === 0 || C.indexOf('### ') === 0) {
          break;
        }
        if (/^  +/.test(C)) {
          text += ' ' + C.trim();
          j++;
          continue;
        }
        if (C.indexOf('- ') !== 0) {
          text += ' ' + C.trim();
          j++;
          continue;
        }
        break;
      }
      items.push(text);
    }
    return {
      html:
        '<ul class="prose-ul">' +
        items
          .map(function (t) {
            return '<li>' + formatInline(t) + '</li>';
          })
          .join('') +
        '</ol>',
      next: j
    };
  }

  function renderBlockquote(lines, i, end) {
    var parts = [];
    var j = i;
    while (j < end && lines[j].indexOf('> ') === 0) {
      parts.push(lines[j].slice(2));
      j++;
    }
    var inner = parts
      .map(function (p) {
        return formatInline(p);
      })
      .join('<br />\n');
    return { html: '<blockquote class="prose-bq"><p>' + inner + '</p></blockquote>', next: j };
  }

  function renderParagraph(lines, i, end) {
    var parts = [];
    var j = i;
    while (j < end) {
      var L = lines[j];
      if (L.trim() === '') {
        break;
      }
      if (L === '---' || L.trim() === '---') {
        break;
      }
      if (L.indexOf('##') === 0 || L.indexOf('###') === 0) {
        break;
      }
      if (L.indexOf('- ') === 0 || /^\d+\.\s+/.test(L) || L.indexOf('> ') === 0) {
        break;
      }
      if (isTableLine(L)) {
        break;
      }
      parts.push(L);
      j++;
    }
    if (parts.length === 0) {
      return { html: '', next: j };
    }
    var body = parts
      .map(function (p) {
        return formatInline(p);
      })
      .join('<br />\n');
    return { html: '<p class="prose-p">' + body + '</p>', next: j };
  }

  function renderFragment(lines, start, end) {
    var out = [];
    var i = start;
    while (i < end) {
      var line = lines[i];
      if (line == null) {
        i++;
        continue;
      }
      if (line === '---' || (line && String(line).trim() === '---')) {
        out.push('<hr class="prose-hr" />');
        i++;
        continue;
      }
      if (line.indexOf('### ') === 0) {
        out.push('<h3 class="prose-h3">' + formatInline(line.slice(4).trim()) + '</h3>');
        i++;
        continue;
      }
      if (line.indexOf('## ') === 0) {
        i++;
        continue;
      }
      if (line.trim() === '') {
        i++;
        continue;
      }
      if (isTableLine(line)) {
        var tbl = renderTable(lines, i, end);
        if (tbl.html) {
          out.push(tbl.html);
        }
        i = tbl.next;
        continue;
      }
      if (line.indexOf('> ') === 0) {
        var bq = renderBlockquote(lines, i, end);
        out.push(bq.html);
        i = bq.next;
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        var ol = renderListOrdered(lines, i, end);
        out.push(ol.html);
        i = ol.next;
        continue;
      }
      if (line.indexOf('- ') === 0) {
        var ul = renderListUnordered(lines, i, end);
        out.push(ul.html);
        i = ul.next;
        continue;
      }
      var para = renderParagraph(lines, i, end);
      if (para.html) {
        out.push(para.html);
      }
      i = para.next;
    }
    return out.join('\n');
  }

  function docTitleSlug(title, n) {
    if (!title) {
      return 'section-' + n;
    }
    var slug = title
      .replace(/\s+/g, '-')
      .replace(/[^\w\uAC00-\uD7A3-]/g, '')
      .slice(0, 48);
    return 'section-' + slug + '-' + n;
  }

  function buildArticle(md) {
    var lines = md.replace(/\r\n/g, '\n').split('\n');
    var h2i = findH2Boundaries(lines);
    var sections = [];
    var ledeHtml = '';
    var heroFragment = '';
    var navItems = [];

    if (h2i.length) {
      var ledeStart = lines[0] && lines[0].indexOf('# ') === 0 ? 1 : 0;
      ledeHtml = renderFragment(lines, ledeStart, h2i[0]);
    }

    for (var k = 0; k < h2i.length; k++) {
      var h2line = lines[h2i[k]];
      var title = h2line.replace(/^##\s+/, '').trim();
      var start = h2i[k] + 1;
      var end = h2i[k + 1] == null ? lines.length : h2i[k + 1];
      var inner = renderFragment(lines, start, end);
      var id = docTitleSlug(title, k);

      if (title === '먼저, 한 문장') {
        heroFragment = inner;
        navItems.push({ title: title, id: 'hero' });
        continue;
      }

      navItems.push({ title: title, id: id });
      sections.push({
        title: title,
        id: id,
        inner: inner
      });
    }

    return { lines: lines, ledeHtml: ledeHtml, heroFragment: heroFragment, sections: sections, navItems: navItems };
  }

  function fillNav(items) {
    var ul = document.getElementById('site-nav-list');
    if (!ul) {
      return;
    }
    ul.innerHTML = '';
    items.forEach(function (t) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'site-nav__link';
      a.href = '#' + t.id;
      a.textContent = t.title;
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  function initNavToggle() {
    var btn = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) {
      return;
    }
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', '메뉴 열기');
      });
    });
  }

  function setFail(msg) {
    var s = document.getElementById('load-status');
    if (s) {
      s.textContent = msg;
      s.classList.add('load-status--error');
    }
  }

  function getMarkdown() {
    var embedded =
      typeof window.INTRO_MD === 'string' && window.INTRO_MD.length > 0 ? window.INTRO_MD : null;

    if (location.protocol === 'file:') {
      if (embedded) {
        return Promise.resolve(embedded);
      }
      return Promise.reject(
        new Error('file-embed-missing')
      );
    }

    return fetch(encodeURI(MD_FILE), { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) {
          throw new Error('HTTP ' + r.status);
        }
        return r.text();
      })
      .catch(function () {
        if (embedded) {
          return embedded;
        }
        throw new Error('fetch-failed');
      });
  }

  function run() {
    var article = document.getElementById('md-article');
    var ledeEl = document.getElementById('lede');
    var ledeInner = document.getElementById('lede-inner');
    var heroLead = document.getElementById('hero-lead');
    var loadStatus = document.getElementById('load-status');

    if (!article) {
      return;
    }

    getMarkdown()
      .then(function (md) {
        var built = buildArticle(md);

        if (built.ledeHtml && ledeInner) {
          ledeInner.innerHTML = built.ledeHtml;
          if (ledeEl) {
            ledeEl.removeAttribute('hidden');
          }
        }

        if (heroLead) {
          if (built.heroFragment) {
            heroLead.innerHTML = built.heroFragment
              .replace(/class="prose-p"/g, 'class="hero__line"')
              .replace(/class=\'prose-p\'/g, "class='hero__line'");
          } else {
            heroLead.textContent = '문장과 화면, 그리고 팀 사이.';
          }
        }

        var html = built.sections
          .map(function (s) {
            return (
              '<section class="content-section" id="' +
              s.id +
              '" aria-labelledby="' +
              s.id +
              '-title">' +
              '<h2 class="prose-h2" id="' +
              s.id +
              '-title">' +
              formatInline(s.title) +
              '</h2>' +
              s.inner +
              '</section>'
            );
          })
          .join('\n');

        article.innerHTML = html;
        article.removeAttribute('hidden');
        if (loadStatus) {
          loadStatus.setAttribute('hidden', 'true');
        }

        fillNav(built.navItems);
        initNavToggle();
      })
      .catch(function (err) {
        if (err && err.message === 'file-embed-missing') {
          setFail(
            'file://로 열려 있을 때는 intro-embed.js(Introduce.md 임베)가 필요합니다. intro-embed.js를 index.html과 같은 폴더에 두었는지 확인하세요.'
          );
          return;
        }
        setFail(
          'Introduce.md를 불러오지 못했습니다. index.html·intro-embed.js·Introduce.md가 같은 경로에 있는지, GitHub Pages에서는 대소문자(Introduce.md)가 맞는지 확인하세요.'
        );
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
