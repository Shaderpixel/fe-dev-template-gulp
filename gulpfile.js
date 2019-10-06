const path = require('path');
const postcssObjectfit = require('postcss-object-fit-images');
const gulp = require('gulp'); // gulp
const $ = require('gulp-load-plugins')({
  // load all plugins in "devDependencies" into the variable $
  pattern: [ '*' ],
  scope: [ 'devDependencies' ]
});
const browserSync = require('browser-sync').create();
const pkg = require('./package.json'); // package vars

function customPlumber(errTitle) {
  return $.plumber({
    errorHandler: $.notify.onError({
      // Customizing error title
      title: errTitle || 'Error running Gulp',
      message: 'Error: <%= error.message %>',
      sound: 'Pop'
    })
  });
}

const banner = [
  '/**',
  ' * @project        <%= pkg.name %>',
  ' * @author         <%= pkg.author %>',
  ` * @copyright      Copyright (c) ${$.moment().format('YYYY')}, <%= pkg.copyright %>`,
  ' *',
  ' */',
  ''
].join('\n');

// TODO move task functions up here
// TODO standardize task names
/* ----------------- */
/* SCREEN CSS GULP TASKS
/* ----------------- */
function scssCompile(src, dest, options) {
  $.fancyLog(`-> Compiling scss: ${options.fileName} into ${dest}`);
  return gulp
    .src(src)
    .pipe(customPlumber(`Error Running Sass Compile: ${options.fileName}`))
    .pipe($.sassGlob())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe(
      $.sass({
        includePaths: [ path.dirname(require.resolve('modularscale-sass')), 'node_modules' ]
      }).on('error', $.sass.logError)
    )
    .pipe($.autoprefixer())
    .pipe($.sourcemaps.write('./'))
    .pipe($.cached(`sass_compile:${options.cacheName}`))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(dest));
}

function cssConcatNano(src, dest, options) {
  $.fancyLog(`-> Building concatenated minified css: ${options.fileName}`);
  return gulp
    .src(src, { allowEmpty: Boolean(options.allowEmpty) })
    .pipe(customPlumber('Error Running cssConcatNano'))
    .pipe($.print.default())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.postcss([ require('postcss-normalize')({ forceImport: true }) ]))
    .pipe($.concat(options.fileName))
    .pipe(
      $.cssnano({
        discardComments: {
          removeAll: true
        },
        discardDuplicates: true,
        discardEmpty: true,
        minifyFontValues: true,
        minifySelectors: true,
        zindex: false
      })
    )
    .pipe($.header(banner, { pkg: pkg }))
    .pipe($.sourcemaps.write('./'))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(dest))
    .pipe($.filter('**/*.css'))
    .pipe(browserSync.reload({ stream: true }));
}

// scss - build the scss to the build folder, including the required paths, and writing out a sourcemap
gulp.task('screenScss', () =>
  scssCompile(pkg.paths.src.base + pkg.paths.src.scss + pkg.vars.scssScreenName, pkg.paths.build.base + pkg.paths.build.css, {
    fileName: pkg.vars.scssScreenName,
    cacheName: 'screenScss'
  })
);

// css task - combine & minimize any vendor CSS into the public css folder
gulp.task('screenCss', () =>
  cssConcatNano(pkg.globs.distCss, pkg.paths.dist.base + pkg.paths.dist.css, { fileName: pkg.vars.siteCssName })
);

/* ----------------- */
/* PRINT CSS GULP TASKS
/* ----------------- */

// scss - build the scss to the build folder, including the required paths, and writing out a sourcemap
gulp.task('printScss', () =>
  scssCompile(pkg.paths.src.base + pkg.paths.src.scss + pkg.vars.scssPrintName, pkg.paths.build.base + pkg.paths.build.css, {
    fileName: pkg.vars.scssPrintName
  })
);

// css task - combine & minimize any vendor CSS into the public css folder
gulp.task('printCss', () =>
  cssConcatNano(pkg.globs.distPrintCss, pkg.paths.dist.base + pkg.paths.dist.css, {
    fileName: pkg.vars.printCssName,
    allowEmpty: true
  })
);

/* ----------------- */
/* Unconcat CSS GULP TASKS
/* ----------------- */
gulp.task('unconcatScss', () =>
  scssCompile(pkg.globs.srcUnconcatScss, pkg.paths.buildUnconcat.base + pkg.paths.buildUnconcat.css, {
    fileName: 'unconcatenated scss files'
  })
);

function cssNano(src, dest, options) {
  $.fancyLog(`-> Building minified css: ${options.fileName}`);
  return gulp
    .src(src, { allowEmpty: Boolean(options.allowEmpty) })
    .pipe(customPlumber(`Error Running cssNano: ${options.fileName}`))
    .pipe($.print.default())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe(
      $.if(
        [ '*.css', '!*.min.css' ],
        $.cssnano({
          discardComments: {
            removeAll: true
          },
          discardDuplicates: true,
          discardEmpty: true,
          minifyFontValues: true,
          minifySelectors: true,
          zindex: false
        })
      )
    )
    .pipe($.if([ '*.css', '!*.min.css' ], $.header(banner, { pkg: pkg })))
    .pipe($.if([ '*.css', '!*.min.css' ], $.rename({ suffix: '.min' })))
    .pipe($.sourcemaps.write('./'))
    .pipe($.cached(`sass_compile:${options.cacheName}`))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(dest))
    .pipe($.filter('**/*.css'))
    .pipe(browserSync.reload({ stream: true }));
}

gulp.task('unconcatCss', () =>
  cssNano(pkg.globs.distUnconcatCss, pkg.paths.distUnconcat.base + pkg.paths.distUnconcat.css, {
    fileName: 'unconcatenated CSS files',
    allowEmpty: true,
    cacheName: 'unconcatCss'
  })
);

/* ----------------- */
/* JS GULP TASKS
/* ----------------- */
gulp.task('eslint', () => {
  $.fancyLog('-> Linting Javascript via eslint...');
  return (
    gulp
      .src(pkg.globs.babelJs)
      // default: use local linting config
      .pipe(
        $.eslint({
          fix: true,
          // Load a specific ESLint config
          configFile: '.eslintrc.json'
        })
      )
      // format ESLint results and print them to the console
      .pipe($.eslint.format())
  );
});

function cachedLint(src, options) {
  $.fancyLog(`-> Linting Javascript ${options.taskName} via eslint...`);
  return (
    gulp
      .src(src)
      .pipe($.cached(options.cacheName))
      // Only uncached and changed files past this point
      .pipe($.eslint())
      .pipe($.eslint.format())
      .pipe(
        $.eslint.result((result) => {
          if (result.warningCount > 0 || result.errorCount > 0) {
            // If a file has errors/warnings remove uncache it
            delete $.cached.caches[options.cacheName][$.path.resolve(result.filePath)];
          }
        })
      )
  );
}

gulp.task('cached-lint', () =>
  cachedLint([ `${pkg.paths.src.base + pkg.paths.src.js}**/*.js`, `!${pkg.paths.src.base + pkg.paths.src.js}/vendor/**/*.js` ], {
    taskName: 'concat JS',
    cacheName: 'eslint'
  })
);

gulp.task('cached-lint:unconcat', () =>
  cachedLint(
    [ `${pkg.paths.src.unconcatBase + pkg.paths.src.js}**/*.js`, `!${pkg.paths.src.unconcatBase + pkg.paths.src.js}/vendor/**/*.js` ],
    {
      taskName: 'unconcat JS',
      cacheName: 'eslintUnconcat'
    }
  )
);

// babel js task - transpile our Javascript into the build directory
gulp.task('js-babel-concat', (done) => {
  $.fancyLog('-> Transpiling Javascript via Babel...');
  $.pump(
    [
      gulp.src(pkg.globs.babelJs),
      customPlumber('Error Running js-babel'),
      $.newer({ dest: pkg.paths.build.js }),
      $.concat(pkg.vars.buildJsName),
      $.babel(),
      $.size({ gzip: true, showFiles: true }),
      gulp.dest(pkg.paths.build.base + pkg.paths.build.js)
    ],
    done
  );
});

// js task - minimize any distribution Javascript into the public js folder, and add our banner to it
gulp.task(
  'js',
  gulp.series('js-babel-concat', () => {
    $.fancyLog('-> Building js');
    return (
      gulp
        .src(pkg.globs.distJs)
        .pipe(customPlumber('Error Running js'))
        // .pipe($.if([ '*.js', '!*.min.js' ], $.newer({ dest: pkg.paths.dist.js, ext: '.min.js' }), $.newer({ dest: pkg.paths.dist.js })))
        .pipe($.concat(pkg.vars.jsName))
        .pipe(
          $.if(
            [ '*.js', '!*.min.js' ],
            $.uglifyEs.default().on('error', (err) => {
              $.fancyLog(err.toString());
            })
          )
        )
        .pipe($.if([ '*.js', '!*.min.js' ], $.rename({ suffix: '.min' })))
        .pipe($.header(banner, { pkg: pkg }))
        .pipe($.size({ gzip: true, showFiles: true }))
        .pipe(gulp.dest(pkg.paths.dist.base + pkg.paths.dist.js))
        .pipe($.filter('**/*.js'))
        .pipe(browserSync.reload({ stream: true }))
    );
  })
);

// babel unconcat js task - transpile our Javascript into the build directory
gulp.task('jsBabelUnconcat', (done) => {
  $.fancyLog('-> Transpiling Javascript via Babel...');
  $.pump(
    [
      gulp.src(pkg.globs.babelUnconcatJs),
      customPlumber('Error Running jsBabelUnconcat'),
      $.newer({ dest: pkg.paths.build.unconcatBase + pkg.paths.build.js }),
      $.babel(),
      $.size({ gzip: true, showFiles: true }),
      gulp.dest(pkg.paths.build.unconcatBase + pkg.paths.build.js)
    ],
    done
  );
});

gulp.task(
  'js:unconcat',
  gulp.series('jsBabelUnconcat', () => {
    $.fancyLog('-> Building Unconcatenated js');
    return (
      gulp
        .src(pkg.globs.distUnconcatJs)
        .pipe(customPlumber('Error minifying js'))
        // .pipe($.if([ '*.js', '!*.min.js' ], $.newer({ dest: pkg.paths.dist.js, ext: '.min.js' }), $.newer({ dest: pkg.paths.dist.js })))
        .pipe($.cached('js:unconcat'))
        .pipe(
          $.if(
            [ '*.js', '!*.min.js' ],
            $.uglifyEs.default().on('error', (err) => {
              $.fancyLog(err.toString());
            })
          )
        )
        .pipe($.if([ '*.js', '!*.min.js' ], $.rename({ suffix: '.min' })))
        .pipe(
          $.if(
            (file) => !file.path.includes(`${pkg.paths.src.unconcatBase}${pkg.paths.src.js}vendor/`),
            $.header(banner, { pkg: pkg }) // add banner only if file is not in the vendor folder
          )
        )
        .pipe($.size({ gzip: true, showFiles: true }))
        .pipe(gulp.dest(pkg.paths.distUnconcat.base + pkg.paths.distUnconcat.js))
        .pipe($.filter('**/*.js'))
        .pipe(browserSync.reload({ stream: true }))
    );
  })
);

/* ----------------- */
/* MISC GULP TASKS
/* ----------------- */

// imagemin task
gulp.task('imagemin', () =>
  gulp
    .src(`${pkg.paths.dist.img}**/*.{png,jpg,jpeg,gif,svg}`)
    .pipe(
      $.imagemin({
        progressive: true,
        interlaced: true,
        optimizationLevel: 7,
        svgoPlugins: [ { removeViewBox: false } ],
        verbose: true,
        use: []
      })
    )
    .pipe(gulp.dest(pkg.paths.dist.img))
);

// task to convert svg to data uri
gulp.task('sassvg', () =>
  gulp.src(`${pkg.paths.src.base + pkg.paths.src.svg}/**/*.svg`).pipe(
    sassvg({
      outputFolder: pkg.paths.dist.base + pkg.paths.dist.svg, // IMPORTANT: this folder needs to exist
      optimizeSvg: true // true (default) means about 25% reduction of generated file size, but 3x time for generating the _icons.scss file
    })
  )
);

// output plugin names in terminal
gulp.task('pluginOutput', () => console.log($));

// copy html from  dev to dist
gulp.task('htmlDistCopy', () =>
  gulp
    .src('assets/src/*.html')
    .pipe(gulp.dest('assets/dist'))
    .pipe(browserSync.reload({ stream: true }))
);

// Copy fonts
gulp.task('fonts', () => gulp.src(pkg.paths.src.fonts, { allowEmpty: true }).pipe(gulp.dest(pkg.paths.dist.fonts)));

// Copy img
gulp.task('img', () =>
  gulp
    .src(`${pkg.paths.src.base + pkg.paths.src.img}/**/*`, { allowEmpty: true })
    .pipe(gulp.dest(pkg.paths.dist.base + pkg.paths.dist.img))
);

// delete dist folder
gulp.task('clean:dist', (done) => {
  $.del.sync('assets/dist/*', { force: true });
  done();
});

// delete build folder
gulp.task('clean:build', (done) => {
  $.del.sync('assets/build/*', { force: true });
  done();
});

gulp.task('browsersync', (done) => {
  // to close browser tab when browserSync disconnects
  browserSync.use({
    plugin: function() {

      /* noop */
    },
    hooks: {
      'client:js': require('fs').readFileSync('./closer.js', 'utf-8')
    }
  });

  browserSync.init({
    server: './assets/dist',
    port: '8080',
    https: true,
    // baseDir: 'assets/dist',
    index: 'index.html',
    // Open the site in Chrome
    browser: [ 'google chrome' ]
  });
  done();
});

/* ----------------- */
/* Run TASKS
/* ----------------- */

gulp.task('screenAll', gulp.series('screenScss', 'screenCss'));
gulp.task('printAll', gulp.series('printScss', 'printCss'));

gulp.task('screenScssWatch', () => {
  gulp.watch([ `${pkg.paths.src.scss}**/*.scss`, '!print.scss' ], gulp.series('screenAll'));
});

gulp.task('printScssWatch', () => {
  gulp.watch([ `${pkg.paths.src.scss}print.scss` ], gulp.series('printAll'));
});

gulp.task('unconcatScssWatch', () => {
  gulp.watch([ `${pkg.globs.srcUnconcatScss}` ], gulp.series('unconcatScss'));
});

gulp.task('unconcatCssWatch', () => {
  gulp.watch(pkg.globs.distUnconcatCss, gulp.series('unconcatCss'));
});

gulp.task('htmlCopyWatch', () => {
  gulp.watch([ `${pkg.paths.src.base}**/*.html` ], gulp.series('htmlDistCopy'));
});

gulp.task('jsLintWatch', () => {
  gulp.watch(`${pkg.paths.src.js}**/*.js`, gulp.series('cached-lint')).on('unlink', (ePath, stats) => {
    // code to execute on delete
    console.log(`${ePath} deleted - [cachedEsLint-watch]`);
    delete $.cached.caches.eslint[ePath]; // remove deleted files from cache
  });
});

// todo add jslintwatch for unconcat files

gulp.task('jsWatch', () => {
  gulp.watch([ `${pkg.paths.src.base + pkg.paths.src.js}**/*.js` ], gulp.series('js'));
});

gulp.task('jsWatch:unconcat', () => {
  gulp.watch([ `${pkg.paths.src.unconcatBase + pkg.paths.src.js}**/*.js` ], gulp.series('js:unconcat'));
});

gulp.task('fontsWatch', () => {
  gulp.watch([ pkg.paths.src.fonts ], gulp.series('fonts'));
});

gulp.task(
  'preWatch',
  gulp.series(
    'clean:build',
    'clean:dist',
    'htmlDistCopy',
    'screenAll',
    'printCss',
    'unconcatScss',
    'unconcatCss',
    'cached-lint',
    'js',
    'js:unconcat',
    'fonts',
    'img'
  )
);

gulp.task(
  'watching',
  gulp.parallel(
    'browsersync',
    'screenScssWatch',
    'printScssWatch',
    'unconcatScssWatch',
    'unconcatCssWatch',
    'htmlCopyWatch',
    'jsLintWatch',
    'jsWatch',
    'jsWatch:unconcat',
    'htmlCopyWatch',
    'fontsWatch'
  )
);

// Default task
gulp.task('default', gulp.series('preWatch', 'watching'));

// Production build
gulp.task('build', gulp.series('clean:dist', 'htmlDistCopy', 'screenAll', 'printCss', 'js', 'fonts', 'img'));

// todo implement SVG sprite
