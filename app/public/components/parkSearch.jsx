import React, {PropTypes} from 'react';
import PureComponent from 'react-pure-render/component';
import Autosuggest from 'react-autosuggest';
import Bloodhound from 'bloodhound-js';
import {injectIntl, defineMessages} from 'react-intl';

import request from 'superagent';

class ParkSearch extends PureComponent {
  constructor() {
    super();

    this.state = {
      value: '',
      parks: []
    };

    this.engine = null;

    this.messages = defineMessages({
      placeholder: {
        id: 'search_placeholder',
        defaultMessage: 'Find a park'
      }
    });

    this.onChange = this.onChange.bind(this);
    this.shouldRenderSuggestions = this.shouldRenderSuggestions.bind(this);
    this.onSuggestionSelected = this.onSuggestionSelected.bind(this);
    this.getSuggestionValue = this.getSuggestionValue.bind(this);
    this.renderSuggestion = this.renderSuggestion.bind(this);
    this.preventPropagation = this.preventPropagation.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  static propTypes = {
    onSearchSelect: PropTypes.func,
    suggestionsLimit: PropTypes.number
  };

  static defaultProps = {
    onSearchSelect: () => {},
    suggestionsLimit: 20
  };

  componentWillMount() {
    const {formatMessage} = this.props.intl;

    this.autoSuggestInputProps = {
      placeholder: formatMessage(this.messages.placeholder),
      onChange: this.onChange,
      onKeyDown: this.preventPropagation,
      onBlur: this.onBlur,
      onFocus: this.onFocus
    };

    this.state.suggestions = this.getMatchingParks('');
    this.getSearchList();
  }

  componentDidMount() {}

  componentDidUpdate() {}

  getSearchList() {
    const context = this;

    request
      .get('/assets/data/parks.json')
      .end((err, res) => {
        if (err) {
          console.error('Loading park search list failed!', err);
        } else {
          const data = JSON.parse(res.text);
          context.engine = new Bloodhound({
            local: data,
            identify: (obj) => { return obj.id; },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: (obj) => { return Bloodhound.tokenizers.whitespace(obj.name); }
          });

          context.setState({parks: data});
        }
      });
  }

  onChange(event, { newValue, method }) {
    if (method === 'type') {
      this.setState({
        value: newValue,
        suggestions: this.getMatchingParks(newValue)
      });
    } else {
      this.setState({
        value: newValue
      });
    }
  }

  onSuggestionSelected(event, { suggestion, suggestionValue, method }) {
    if (typeof this.props.onSearchSelect === 'function') {
      this.props.onSearchSelect(suggestion.id);
    }
    this.setState({
      suggestions: this.getMatchingParks(suggestionValue)
    });
  }

  getSuggestionValue(suggestion) {
    return suggestion.name;
  }

  escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  superEscapeRegexCharacters(str) {
    return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, '\\$1');
  }

  getMatchingParks(value) {
    const {parks} = this.state;
    const {suggestionsLimit} = this.props;

    if (!parks || !parks.length || !this.engine) return [];

    const escapedValue = this.escapeRegexCharacters(value.trim());

    let things = [];

    this.engine.search(escapedValue,
      (results) => {
        things = results;
      },
      (results) => {}
    );

    if (suggestionsLimit && suggestionsLimit > 0) return things.slice(0, suggestionsLimit);
    return things;
  }

  highlightName(name) {
    const {value} = this.state;
    const escapedValue = this.superEscapeRegexCharacters(value.trim());
    return name.replace(new RegExp('(' + escapedValue + ')', 'gi'), '<b>$1</b>');
  }

  renderSuggestion(suggestion) {
    return (
      <button className='btn link'>
        <span dangerouslySetInnerHTML={{__html:this.highlightName(suggestion.name)}} />
      </button>
    );
  }

  shouldRenderSuggestions(value) {
    return value.trim().length > 1;
  }

  onBlur() {
    this.removeMouseWheelEventHandlers();
  }

  onFocus() {
    this.removeMouseWheelEventHandlers();
    this.addMouseWheelEventHandlers();
  }

  addMouseWheelEventHandlers() {
    const elm = document.querySelector('.SectionContainer');

     // detect available wheel event
    const support = 'onwheel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"
      document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
      'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox


    if (support === 'DOMMouseScroll') {
      elm.addEventListener('MozMousePixelScroll', this.onMouseWheel);
    } else {
      elm.addEventListener(support, this.onMouseWheel);
    }
  }

  removeMouseWheelEventHandlers() {
    const elm = document.querySelector('.SectionContainer');
    elm.removeEventListener('mousewheel', this.onMouseWheel);
    elm.removeEventListener('wheel', this.onMouseWheel);
    elm.removeEventListener('MozMousePixelScroll', this.onMouseWheel);
  }

  onMouseWheel(e) {
    const event = e || window.event;

    if (event.stopPropagation) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    } else {
      event.cancelBubble = true;
    }

    return false;
  }

  preventPropagation(e) {
    const event = e || window.event;

    if (event.stopPropagation) {
      event.stopPropagation();
    } else {
      event.cancelBubble = true;
    }
  }

  render() {
    const { value, suggestions } = this.state;
    this.autoSuggestInputProps.value = value;

    return (
      <Autosuggest suggestions={suggestions}
                  shouldRenderSuggestions={this.shouldRenderSuggestions}
                  getSuggestionValue={this.getSuggestionValue}
                  renderSuggestion={this.renderSuggestion}
                  inputProps={this.autoSuggestInputProps}
                  onSuggestionSelected={this.onSuggestionSelected} />
    );
  }
}

export default injectIntl(ParkSearch);
