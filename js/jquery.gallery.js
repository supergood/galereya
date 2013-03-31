(function ($) {
    'use strict';

    function Gallery(options) {
        var self = this;

        /**
         * JQuery variables
         */
        var $cells,
            $grid,
            $imgs,
            $categoriesList,
            $slider, $sliderContainer,
            $sliderNext, $sliderPrev, $sliderDesc, $sliderClose, $sliderPlay,
            $currentSlide = $(), $currentImg = $();

        /**
         * Variables
         * @type {Array}
         */
        var data = [],
            categories = [],
            visibleCells = [],
            slides = [],
            htmlOverflow, bodyOverflow,
            loadTimeout, resizeTimeout,
            currentSlideIndex,
            isSliderOpened = false,
            slideShowInterval;

        /**
         * Default options
         * @type {Object}
         */
        var defaults = {
            rowCount: 0, //auto calculated
            cellW: 300, //auto calculated from css
            spacing: 0,
            waveTimeout: 300,
            slideShowSpeed: 10000,
            noCategoryName: 'all'
        };

        /**
         * Event handlers
         * @type {Object}
         */
        var Handlers = {
            windowResize: function() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    resize();
                }, 100);
            },
            bodyClick: function(e) {
                if($(e.target).closest('.gallery-select').length === 0) {
                    $categoriesList.removeClass('open');
                }
            },
            categoriesListClick: function(e) {
                var $target = $(e.target),
                    nodeName = e.target.nodeName;

                if(nodeName === 'SPAN') {
                    $target = $target.parent();
                }

                if(!$target.is(':first-child')) {
                    changeCategory($target.find('span').text());
                }

                $categoriesList.toggleClass('open');
            },
            cellClick: function() {
                openSlider(parseInt(this.getAttribute('data-visibleIndex'), 10));
            },
            sliderNextClick: function() {
                changeSlide('next');
            },
            sliderPrevClick: function() {
                changeSlide('prev');
            },
            sliderCloseClick: function() {
                closeSlider();
            },
            sliderPlayClick: function() {
                if(!slideShowInterval) {
                    startSlideShow();
                } else {
                    stopSlideShow();
                }
            },
            bodyKeyDown: function(e) {
                if(isSliderOpened) {
                    if(e.which === 37 || e.which === 39) {
                        e.preventDefault();
                    }
                }
            },
            bodyKeyUp: function(e) {
                if(isSliderOpened) {
                    switch(e.which) {
                        case 27:
                            closeSlider();
                            break;
                        case 37:
                            $sliderPrev.click();
                            break;
                        case 39:
                            $sliderNext.click();
                            break;
                        default:
                    }
                }
            }
        };

        /**
         * Local constructor
         */
        var constructor = function() {
            loadData();
            buildDOM();
            resize();
            loadImages();
            if(checkTransitionsSupport()) {
                wave();
            }
            addEventListeners();
        };

        /**
         * Checks css transitions support
         * @return {Boolean}
         */
        var checkTransitionsSupport = function() {
            var s = document.createElement('div').style,
                supportsTransitions = 'transition' in s ||
                    'WebkitTransition' in s ||
                    'MozTransition' in s ||
                    'msTransition' in s ||
                    'OTransition' in s;

            return supportsTransitions;
        };

        /**
         * Get transition duration in ms
         * @return {Boolean}
         */
        var getTransitionDuration = function($elem) {
            var td = $elem.css('transitionDuration') ||
                $elem.css('webkitTransitionDuration') ||
                $elem.css('mozTransitionDuration') ||
                $elem.css('oTransitionDuration') ||
                $elem.css('msTransitionDuration') ||
                0;
            td = parseInt(td, 10) * 1000;

            return td;
        };

        /**
         * Calculate some starting params
         */
        var calcParams = function() {
            self.options.cellW = $cells.width();

            self.options.rowCount = Math.floor(self.width() / (self.options.cellW + self.options.spacing));
            if(self.options.rowCount < 1) {
                self.options.rowCount = 1;
            }

            self.options.gridW = self.options.rowCount * self.options.cellW;
        };

        /**
         * Loading data
         */
        var loadData = function() {
            var item;
            $imgs = self.find('img').each(function(i, img) {
                item = {
                    "lowsrc": img.getAttribute('src') || '',
                    "src": img.getAttribute('data-fullsrc') || '',
                    "title": img.getAttribute('title') || img.getAttribute('alt') || '',
                    "description": img.getAttribute('data-desc') || '',
                    "category": img.getAttribute('data-category') || ''
                };

                if(item.category) {
                    item.category = item.category.toLowerCase();
                    if($.inArray(item.category, categories) === -1) {
                        categories.push(item.category);
                    }
                }

                data.push(item);
            });
        };

        /**
         * Building DOM
         */
        var buildDOM = function() {
            self.addClass('gallery');

            if(categories.length > 0) {
                $categoriesList = $('<ul class="gallery-select-list" />');
                self.prepend($('<div class="gallery-top" />').html($categoriesList));
                $categoriesList.wrap('<div class="gallery-select" />');

                $categoriesList.append('<li class="gallery-select-item"><span>' + self.options.noCategoryName + '</span></li>');
                for(var i = 0; i < categories.length; i++) {
                    $categoriesList.append('<li class="gallery-select-item"><span>' + categories[i] + '</span></li>');
                }
            }

            var $img, title, desc;
            $imgs.wrapAll('<div class="gallery-grid" />').each(function(i, img) {
                $img = $(img);
                title = data[i].title;
                desc = data[i].description;
                $img.addClass('gallery-cell-img')
                    .wrap('<div class="gallery-cell" data-index="' + i + '"></div>')
                    .parent()
                    .append('<div class="gallery-cell-desc">\
                                <div class="gallery-cell-desc-title">' + title + '</div>\
                                <div class="gallery-cell-desc-text">' + desc + '</div>\
                            </div>')
                    .append('<div class="gallery-cell-overlay" />');
            });

            $cells = self.find('.gallery-cell');
            $grid = self.find('.gallery-grid');

            $slider = $('<div class="gallery-slider" />');
            $sliderContainer = $('<div class="gallery-slider-container" />');
            $sliderNext = $('<div class="gallery-slider-nav right" />');
            $sliderPrev = $('<div class="gallery-slider-nav left" />');
            $sliderDesc = $('<div class="gallery-slider-desc" />');
            $sliderClose = $('<div class="gallery-slider-close" />');
            $sliderPlay = $('<div class="gallery-slider-play" />');
            $slider
                .append($sliderContainer)
                .append($sliderNext)
                .append($sliderPrev)
                .append($sliderDesc)
                .append($sliderDesc)
                .append($sliderClose)
                .append($sliderPlay);
            $(document.body).append($slider);

            self.show();
        };

        /**
         * Loading images. If image is already loaded, just show it.
         * @param index - starting index of an image
         * @param category - category of images
         */
        var loadImages = function(index, category) {
            index = index || 0;

            if(index >= $imgs.length) {
                return;
            }

            clearTimeout(loadTimeout);

            if(category && data[index].category !== category) {
                setTimeout(function() {
                    loadImages(++index, category);
                }, 0);
                return;
            }

            var img = $imgs[index],
                onload = function() {
                    if(isSliderOpened) {
                        $(this).parent().show();
                    } else {
                        $(this).parent().fadeIn(200, 'linear');
                    }
                    loadTimeout = setTimeout(function() {
                        loadImages(++index, category);
                    }, 100);
                };

            if(!img.complete) {
                $(img).attr("src", img.src).load(onload);
            } else {
                onload.call(img);
            }
            showCell(index);
        };

        /**
         * Show cell of an image
         * @param index - index of an image.
         */
        var showCell = function(index) {
            var cell = $cells[index],
                currentIndex;

            placeCell(cell, visibleCells.length);
            currentIndex = visibleCells.push(cell) - 1;

            $(cell).addClass('visible').attr('data-visibleIndex', currentIndex);
        };

        /**
         * Place the cell into the grid of a visible cells
         * @param cell
         * @param number
         */
        var placeCell = function(cell, number) {
            var left, top, topCell, row;

            row = number % self.options.rowCount;
            left = row * self.options.cellW + self.options.spacing * row;
            if(number  >= self.options.rowCount) {
                topCell = visibleCells[number - self.options.rowCount];
                top = topCell.offsetTop + topCell.offsetHeight + self.options.spacing;
            } else {
                top = 0;
            }

            cell.style.top = top + 'px';
            cell.style.left = left + 'px';
        };

        /**
         * Clear the grid
         */
        var hideCells = function() {
            visibleCells = [];
            $cells.fadeOut(200).removeClass('visible');
        };

        /**
         * Wave pulsation
         * @param index - index of a cell
         */
        var wave = function(index) {
            index = index || 0;
            if(index >= $cells.length) {
                index = 0;
            }

            var $cell = $($cells[index]);
            $cell.addClass('wave');

            setTimeout(function() {
                $cell.removeClass('wave');
                wave(++index);
            }, self.options.waveTimeout);
        };

        /**
         * Change current category of images
         * @param category
         */
        var changeCategory = function(category) {
            $categoriesList.empty().prepend('<li class="gallery-select-item"><span>' + category + '</span></li>');

            hideCells();
            if(category === self.options.noCategoryName) {
                loadImages(0);
            } else {
                $categoriesList.append('<li class="gallery-select-item"><span>' + self.options.noCategoryName + '</span></li>');
                loadImages(0, category);
            }

            for(var i = 0, len = categories.length, cat; i < len; i++) {
                cat = categories[i];
                if(cat !== category) {
                    $categoriesList.append('<li class="gallery-select-item"><span>' + cat + '</span></li>');
                }
            }
        };

        /**
         * Gallery resizing
         */
        var resize = function() {
            calcParams();

            if($currentImg.length === 0) {
                $currentImg = $currentSlide.find('.gallery-slide-img');
            }
            $currentImg.css('margin-top', ($(window).height() - $currentImg.height()) / 2);
            $grid.width(self.options.gridW);

            for(var i = 0, len = visibleCells.length; i < len; i++) {
                placeCell(visibleCells[i], i);
            }
        };

        /**
         * Show slider
         * @param visibleIndex
         */
        var openSlider = function(visibleIndex) {
            if(isSliderOpened) {
                setTimeout(function() {
                    openSlider(visibleIndex);
                }, 50);
                return;
            }

            stopSlideShow();

            var index = parseInt(visibleCells[visibleIndex].getAttribute('data-index'), 10);

            currentSlideIndex = visibleIndex;
            htmlOverflow = $('html').css('overflow');
            bodyOverflow = $('body').css('overflow');
            $('html, body').css('overflow', 'hidden');

            $sliderContainer.empty();

            $slider.show(0, function() {
                $slider.addClass('opened');
            });
            isSliderOpened = true;

            changeSlide();
            updateNavigation();
        };

        /**
         * Close slider
         */
        var closeSlider = function() {
            if(!isSliderOpened) {
                return;
            }

            var td = getTransitionDuration($slider),
                next = function() {
                    stopSlideShow();
                    slides = [];
                    $sliderContainer.empty();
                    $slider.hide();
                    $('html').css('overflow', htmlOverflow);
                    $('body').css('overflow', bodyOverflow);
                    isSliderOpened = false;
                };

            $slider.removeClass('opened');
            if(checkTransitionsSupport()) {
                setTimeout(next, td + 100);
            }
        };

        /**
         * Create slide
         * @param visibleIndex
         */
        var createSlide = function(visibleIndex) {
            clearInterval(slideShowInterval); //freeze slide show

            var cell = visibleCells[visibleIndex],
                index = parseInt(cell.getAttribute('data-index'), 10),
                $slide,
                $img;

            $slide = $('<div class="gallery-slider-slide" />')
                .html('<div class="gallery-slide-loader"></div>');

            $img = $('<img class="gallery-slide-img" src="' + data[index].src + '" alt="' + data[index].title + '" />').load(function() {
                $slide.html($img);
                $img.css('margin-top', ($(window).height() - $img.height()) / 2);
                if(slideShowInterval) {
                    startSlideShow(); //resume slide show when an image is loaded
                }
            });

            return $slide;
        };

        /**
         * Go to slide
         * @param direction
         */
        var changeSlide = function(direction) {
            direction = direction || 'next';

            //restore slide show interval, if slide show currently works.
            //Make it works correctly, when someone clicked next or prev button.
            if(slideShowInterval) {
                stopSlideShow();
                startSlideShow();
            }

            var nextSlideIndex,
                dir = direction.toLowerCase(),
                $slide,
                index,
                slidesCount = visibleCells.length;

            if(dir === 'next') {

                if(slides.length === 0) {
                    nextSlideIndex = currentSlideIndex;
                    dir = '';
                } else {
                    nextSlideIndex = currentSlideIndex + 1;
                    if(nextSlideIndex >= slidesCount) {
                        return;
                    }
                }

                $slide = slides[nextSlideIndex];
                if(!$slide) {
                    $slide = createSlide(nextSlideIndex);
                    $slide.addClass(dir);
                    $sliderContainer.append($slide);
                    slides[nextSlideIndex] = $slide;
                }
                changeSlideState($slide, 'current');
                changeSlideState($currentSlide, 'prev');

            } else if(dir === 'prev') {

                if(slides.length !== 0) {
                    dir = '';
                }
                nextSlideIndex = currentSlideIndex - 1;
                if(nextSlideIndex < 0) {
                    return;
                }

                $slide = slides[nextSlideIndex];
                if(!$slide) {
                    $slide = createSlide(nextSlideIndex);
                    $slide.addClass(dir);
                    $sliderContainer.prepend($slide);
                    slides[nextSlideIndex] = $slide;
                }
                changeSlideState($slide, 'current');
                changeSlideState($currentSlide, 'next');

            }

            index = visibleCells[currentSlideIndex].getAttribute('data-index');
            $sliderDesc.empty().html('<span class="gallery-slider-desc-title">' + data[index].title + ' </span>' + data[index].description);

            currentSlideIndex = nextSlideIndex;
            $currentSlide = $slide;
            $currentImg = $slide.find('.gallery-slide-img');
            $currentImg.css('margin-top', ($(window).height() - $currentImg.height()) / 2);

            updateNavigation();
        };

        /**
         * Change state of a slide
         * @param $slide
         * @param direction
         */
        var changeSlideState = function($slide, direction) {
            setTimeout(function() {
                $slide
                    .removeClass('prev')
                    .removeClass('next')
                    .removeClass('current')
                    .addClass(direction);
            }, 50);
        };

        /**
         * Update navigation
         */
        var updateNavigation = function() {
            var len = visibleCells.length;

            if(currentSlideIndex >= len - 1) {
                stopSlideShow();
                $sliderPlay.hide();
                $sliderNext.hide();
            } else {
                $sliderPlay.show();
                $sliderNext.show();
            }

            if(currentSlideIndex <= 0) {
                $sliderPrev.hide();
            } else {
                $sliderPrev.show();
            }
        };

        /**
         * Start slide show
         */
        var startSlideShow = function() {
            $sliderPlay.addClass('pause');
            slideShowInterval = setInterval(function() {
                $sliderNext.click();
            }, self.options.slideShowSpeed);
        };

        /**
         * Stop slide show
         */
        var stopSlideShow = function() {
            $sliderPlay.removeClass('pause');
            clearInterval(slideShowInterval);
            slideShowInterval = null;
        };

        /**
         * Add event listeners
         */
        var addEventListeners = function() {
            $(window).resize(Handlers.windowResize);
            $(document.body).click(Handlers.bodyClick)
                .keydown(Handlers.bodyKeyDown)
                .keyup(Handlers.bodyKeyUp);
            $categoriesList.click(Handlers.categoriesListClick);
            $cells.click(Handlers.cellClick);
            $sliderNext.click(Handlers.sliderNextClick);
            $sliderPrev.click(Handlers.sliderPrevClick);
            $sliderClose.click(Handlers.sliderCloseClick);
            $sliderPlay.click(Handlers.sliderPlayClick);
        };

        /**
         * Public
         */
        this.options = $.extend({}, defaults, options);
        this.openSlider = openSlider;
        this.closeSlider = closeSlider;
        this.changeCategory = changeCategory;
        this.nextSlide = function() {
            $sliderNext.click();
        };
        this.prevSlide = function() {
            $sliderPrev.click();
        };

        constructor();
        if (this.length > 1){
            this.each(function() {
                $(this).gallery(options);
            });
        }
        return this;
    }

    $.fn.gallery = Gallery;
}(jQuery));