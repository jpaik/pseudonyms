var gulp = require('gulp'),
    newer = require('gulp-newer'),
    imagemin = require('gulp-imagemin'),
    concat = require('gulp-concat'),
    order = require('gulp-order'),
    babel = require('gulp-babel'),
    stripdebug = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    assets = require('postcss-assets'),
    autoprefixer = require('autoprefixer'),
    mqpacker = require('css-mqpacker'),
    cssnano = require('cssnano');

var folder = {
  src: 'src/',
  build: 'public/'
}


gulp.task('images', function() {
  var out = folder.build + 'images/';
  return gulp.src(folder.src + 'images/**/*')
    .pipe(newer(out))
    .pipe(imagemin({ optimizationLevel: 5 }))
    .pipe(gulp.dest(out));
});

gulp.task('js', function() {
  var jsbuild = gulp.src(folder.src + 'js/**/*')
    // .pipe(order([]))
    .pipe(babel({
      presets: ['es2015']
    }))
    // .pipe(concat('main.js'))
    // .pipe(stripdebug())
    .pipe(uglify());

  return jsbuild.pipe(gulp.dest(folder.build + 'js/'));
});

gulp.task('css', function() {
  var postCssOpts = [
  // assets({ loadPaths: ['images/'] }),
  autoprefixer({ browsers: ['last 2 versions', '> 2%'] }),
  cssnano
  ];
  return gulp.src(folder.src + 'scss/main.scss')
    .pipe(sass({
      outputStyle: 'nested',
      // imagePath: 'images/',
      precision: 3,
      errLogToConsole: true
    }))
    .pipe(concat('style.css'))
    .pipe(postcss(postCssOpts))
    .pipe(gulp.dest(folder.build + 'css/'));
});

gulp.task('run', ['css', 'js']);

gulp.task('watch', function() {
  // image changes
  gulp.watch(folder.src + 'images/**/*', ['images']);
  // javascript changes
  gulp.watch(folder.src + 'js/**/*', ['js']);
  // css changes
  gulp.watch(folder.src + 'scss/**/*', ['css']);

});