import PureComponent from 'react-pure-render/component';
import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {FormattedMessage, injectIntl} from 'react-intl';
import {throttle, isEmpty} from 'lodash';
import * as actions from '../actions';

import Footer from '../partials/footer';
import StickyNav from '../partials/sticky-nav';
import ParkMap from '../components/parkMap';
import ActivityGrid from '../components/activityGrid';
import Slider from 'react-slick';
import {socs} from '../lib/socs';
import {directionsLink} from '../../constants/map';
import {MOBILE_BREAKPOINT} from '../../constants/layout';

function mapStateToProps(state) {
  return state;
}

export class Park extends PureComponent {
  static propTypes = {
    params: PropTypes.shape({
      id: PropTypes.string.isRequired
    }).isRequired,
    selectedPark: PropTypes.object,
    windowSize: PropTypes.object,
    setWindowSize: PropTypes.func,
    fetchSelectedPark: PropTypes.func,
    clearSelectedParkData: PropTypes.func,
    fetchSelectedParkPhotos: PropTypes.func
  };

  state = {
    selectedPhoto: null,
    badImages: [],
    tabSection: 'photos'
  };

  componentWillMount() {
    // set state back to original state
    this.setState({
      selectedPhoto: null,
      badImages: []
    });
    this.mapNeedsResizing = true;
    this.getInitialSelectedPhoto();
  }

  componentDidMount() {
    this.handleResizeThrottled = throttle(this.handleResize, 250).bind(this);
    window.addEventListener('resize', this.handleResizeThrottled);
    document.querySelector('body').style.overflow = 'auto';
    this.handleResize();

    this.shouldFetchSelectedPark();

    this.socs = socs.sharing();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.id !== this.props.selectedPark.parkid) {
      this.setState({
        selectedPhoto: null,
        badImages: []
      });
    }
  }

  shouldFetchSelectedPark() {
    if (!this.props.selectedPark.isFetching) {
      if (isEmpty(this.props.selectedPark.park)) {
        this.props.fetchSelectedPark(this.props.params.id);
      } else if (this.props.selectedPark.parkid !== this.props.params.id) {
        this.props.fetchSelectedPark(this.props.params.id);
      }
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.params.id !== this.props.params.id) {
      this.props.fetchSelectedPark(nextProps.params.id);
    } else {
      this.mapNeedsResizing = false;
      if (nextState.tabSection === 'map' && (this.state.tabSection !== nextState.tabSection)) this.mapNeedsResizing = true;
      if (nextProps.windowSize.width !== this.props.windowSize.width || nextProps.windowSize.height !== this.props.windowSize.height) this.mapNeedsResizing = true;
      if (nextState.badImages !== this.state.badImages) this.mapNeedsResizing = true;
    }

    this.getInitialSelectedPhoto();
  }

  componentDidUpdate() {
    this.getInitialSelectedPhoto();
    if (this.socs) this.socs.refresh();
  }

  componentWillUnmount() {
    this.props.clearSelectedParkData(this.props.params.id);
    window.removeEventListener('resize', this.handleResizeThrottled);
    if (this.socs) this.socs.destroy();
    this.socs = null;
  }

  getInitialSelectedPhoto() {
    if (this.state.selectedPhoto === null &&
        this.props.selectedPark.images &&
        this.props.selectedPark.images.length) {
      this.setState({selectedPhoto: this.props.selectedPark.images[0].photoid});
    }
  }

  onPhotoClick(photoid) {
    if (this.state.selectedPhoto === photoid) return;
    this.setState({selectedPhoto: photoid});
  }

  setMarkerIcon(marker, idx) {
    if (marker.photoid === this.state.selectedPhoto) return '/assets/svgs/icon-instagram.svg';
    return '/assets/svgs/icon-square-4px.svg';
  }

  setMarkerId(marker, idx) {
    return marker.photoid;
  }

  setMarkerPosition(marker, idx) {
    return {lat:marker.lat, lng:marker.lng};
  }

  getWindowDimensions() {
    // Need to make sure we have a window due to
    // server rendering...
    if (typeof window === 'undefined') return {width: 0, height: 0};

    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  // TODO: clean this up
  // got messy when we had to account for
  // no images
  //
  // returns [columnWidth, columnMiddleWidth, columnHeight, columnMiddleHeight, bottomHeight]
  getDimensions() {
    if (!this.props.windowSize.width ||
        this.props.windowSize.width === 0 ||
        this.props.windowSize.width < MOBILE_BREAKPOINT) {
      return ['100%', '100%', 'auto', this.props.windowSize.width + 'px', 'auto'];
    }

    const photoSliderHeight = 160 + 20; // with padding
    const topContainerPadding = 20;
    const nav = 76;
    const imagesLength = this.getValidImages().length;
    const bottomHeight = (imagesLength) ? 180 : 0;
    const availableWidth = this.props.windowSize.width - 20;

    let middleWidth = 33.3333;
    let topHeight = this.props.windowSize.height - nav - topContainerPadding;

    if (!imagesLength) {
      return [middleWidth + '%', '66.6666%', topHeight + 'px', topHeight + 'px', bottomHeight + 'px'];
    }

    topHeight -= photoSliderHeight;
    middleWidth = (availableWidth - (2 * topHeight));

    if (middleWidth < topHeight) {
      middleWidth = 33.3333;
      topHeight = Math.round((this.props.windowSize.width - 20) * (middleWidth / 100));
      return [middleWidth + '%', middleWidth + '%', topHeight + 'px', topHeight + 'px', bottomHeight + 'px'];
    }

    const otherWidth = Math.max(330, (availableWidth - middleWidth) / 2) / availableWidth * 100;
    middleWidth = 100 - otherWidth * 2;
    topHeight = Math.round((availableWidth) * (otherWidth / 100));

    return [otherWidth + '%', middleWidth + '%', topHeight + 'px', topHeight + 'px', bottomHeight + 'px'];
  }

  getSlidesToShowLength() {
    if (this.props.windowSize.width === 0 || this.props.windowSize.width < MOBILE_BREAKPOINT) return 1;
    return Math.ceil((this.props.windowSize.width - 20) / 160);
  }

  loadPhotos() {
    if (!this.props.selectedPark.images.length) return;
    if (this.props.selectedPark.isFetching) return;
    this.props.fetchSelectedParkPhotos(this.props.params.id, this.props.selectedPark.images.length);
  }

  placeImage() {
    if (!this.props.selectedPark.images.length && !this.state.selectedPhoto) return [];
    const image = this.props.selectedPark.images.filter((photo) => {
      return photo.photoid === this.state.selectedPhoto;
    });
    if (!image.length) return [];

    return (
      <div className='inner'>
        <div className='instagram-logo' />
        <a className='block' href={image[0].link} target='_blank'><img src={image[0].standard_resolution} /></a>
      </div>
    );
  }

  geoJSONBBoxToGoogleBounds(envelope) {
    const bds = new google.maps.LatLngBounds(new google.maps.LatLng(envelope[0][1], envelope[0][0]));
    for (let i = 0; i < envelope.length; i++) {
      bds.extend(new google.maps.LatLng(envelope[i][1], envelope[i][0]));
    }
    return bds;
  }

  handleResize() {
    this.props.setWindowSize(this.getWindowDimensions());
  }

  renderDetails() {
    if (!this.props.selectedPark.park.length) return [];
    const details = this.props.selectedPark.park[0];
    const directions = directionsLink(details.centroid);
    const involved = this.props.selectedPark.involved || null;

    return (
      <div className='inner'>
        <h4 className='uppercase'>{details.su_name}</h4>
        <p><a className='link-plain' href={details.park_url} target='_blank'>
        <FormattedMessage
          id='park.park-link'
          defaultMessage='Link to park site'
        />
        <sub> &gt;</sub>
        </a></p>
        {involved &&
          <p className='involved-link'><a className='link-plain' href={involved} target='_blank'>
          <FormattedMessage
            id='park.involved-link'
            defaultMessage='Get involved with this park'
          />
          <sub> &gt;</sub>
          </a></p>
        }
        <ActivityGrid activities={details.activities} {...this.props} />
        <div className='share'>
          <ul>
            <li><a className='link-plain social-item' data-social-service='facebook' href='#'>
              <FormattedMessage
                id='social.share'
                defaultMessage='Share'
              />
            </a></li>
            <li><a className='link-plain social-item' data-social-service='twitter' data-social-title={details.su_name} data-social-hashtags='caliparks' href='#'>
              <FormattedMessage
                id='social.tweet'
                defaultMessage='Tweet'
              />
            </a></li>
            <li><a className='link-plain' href={directions} target='_blank'>
              <FormattedMessage
                id='directions-link'
                defaultMessage='Get Directions'
              />
            </a></li>
            {details.camping_url &&
              <li><a className='link-plain' href={details.camping_url} target='_blank'>
                <FormattedMessage
                  id='camp-here'
                  defaultMessage='Camp Here'
                />
              </a></li>
            }
          </ul>
        </div>
      </div>
    );
  }

  onImageError(photo) {
    const badImages = this.state.badImages.slice(0);
    badImages.push(photo.photoid);
    this.setState({
      badImages: badImages
    });
  }

  getValidImages() {
    return this.props.selectedPark.images.filter((img) => {
      return this.state.badImages.indexOf(img.photoid) < 0;
    });
  }

  makeSlides() {
    return this.getValidImages().map((photo, idx) => {
      const klass = photo.photoid === this.state.selectedPhoto ? 'selected' : '';
      return (
        <div className={klass} key={idx}><img onError={this.onImageError.bind(this, photo)} src={photo.standard_resolution} onClick={this.onPhotoClick.bind(this, photo.photoid)}/></div>
      );
    });
  }

  onSliderAfterChange(currentSlide) {
    const numShowing = this.getSlidesToShowLength();
    const {badImages} = this.state;

    if (currentSlide + numShowing >= (this.props.selectedPark.images.length - badImages.length) && !this.props.selectedPark.isFetching) {
      this.loadPhotos();
    }
  }

  onTabChange(val) {
    if (val === this.state.tabSection) return;
    this.setState({tabSection: val});
  }

  getTabBtnClass(val) {
    const active = val === this.state.tabSection ? ' active' : '';
    return 'btn' + active;
  }

  render() {
    const geometry = this.props.selectedPark.park.length ? this.props.selectedPark.park[0].geometry : null;
    const [columnWidth, columnMiddleWidth, columnHeight, mapHeight, bottomHeight] = this.getDimensions();

    const settings = {
      dots: false,
      infinite: false,
      speed: 500,
      arrows: true,
      slidesToShow: this.getSlidesToShowLength(),
      variableWidth: false,
      slidesToScroll: this.getSlidesToShowLength(),
      slideHasThisWidth: (this.props.windowSize.width < MOBILE_BREAKPOINT) ? this.props.windowSize.width : 160,
      initialSlide: 0
    };

    const parkSlideClass = this.props.selectedPark.isFetching ? ' loading' : '';
    const validImages = this.getValidImages();
    const markers = validImages.filter((photo, idx) => {
      return this.state.selectedPhoto === photo.photoid;
    });

    // In case we have no images...
    const containerClass = (validImages.length === 0) ? 'theme-white page-park container no-images' : 'theme-white page-park container';

    return (
      <div className={containerClass + ' tab-' + this.state.tabSection}>
        <StickyNav />
        <main role='application'>
          <div className='page-park-wrapper'>
            <div className='col details' style={{height: columnHeight, width: columnWidth }}>
              {this.renderDetails()}
            </div>
            <div className='tabs'>
              <div className='tabs-inner'>
                <button className={this.getTabBtnClass('photos')} onClick={this.onTabChange.bind(this, 'photos')}>
                  <FormattedMessage
                    id='tab.photoview'
                    defaultMessage='Photo View' />
                </button>
                <button className={this.getTabBtnClass('map')} onClick={this.onTabChange.bind(this, 'map')}>
                  <FormattedMessage
                    id='tab.mapview'
                    defaultMessage='Map View' />
                </button>
              </div>
            </div>
            <div className='col map' style={{height: mapHeight, width: columnMiddleWidth}}>
              <div className='inner'>
                <ParkMap
                  shouldResize={this.mapNeedsResizing}
                  markers={markers}
                  cluster={false}
                  geometry={geometry}
                  selectedMarker={this.state.selectedPhoto}
                  setMarkerIcon={this.setMarkerIcon.bind(this)}
                  setMarkerId={this.setMarkerId.bind(this)}
                  setMarkerPosition={this.setMarkerPosition.bind(this)}/>
              </div>

              <div className='park-slider-container' style={{height: bottomHeight}}>
                <div className='slider-inner'>
                  <div className={'park-slider' + parkSlideClass}>
                    <div className='loader' />
                    <Slider {...settings} afterChange={this.onSliderAfterChange.bind(this)}>
                      {this.makeSlides()}
                    </Slider>
                  </div>
                </div>
              </div>
            </div>

            <div className='col selected-photo' style={{height: columnHeight, width: columnWidth}}>
              {this.placeImage()}
            </div>

          </div>
        </main>
        <div>
          <div className='scroll-helper-arrow down no-arrow'/>
          <Footer lang={this.props.lang} />
        </div>
      </div>
    );
  }
}

export const ParkContainer = injectIntl(connect(mapStateToProps, actions)(Park));
