(function() {
  function log(message, type = 'log') {
    if (typeof window !== 'undefined' && window.console && window.console[type]) {
      window.console[type]('BEEHIIV_LOG: ' + message);
    }
  }

  // Declare a global object to store the state of the widget
  window.beehiiv = {
    recommendationsLoaded: false,
    publicationId: null,
    email: null,
    redirectUrl: null,
    recommendationsHTML: null,
    showRecommendations: function() {
      log("The widget has not loaded and ready to show recommendations yet!", 'info');
    },
    log: log,
  };

  var FONTS = [
    "https://fonts.googleapis.com/css2?family=Open+Sans",
  ];

  var scriptTag = document.querySelector('[data-beehiiv-recommendations-widget]');
  if (!scriptTag || !scriptTag.src) {
    window.beehiiv.log('Initialisation failed!', 'error');
    return;
  }

  try {
    window.beehiiv.publicationId = new URLSearchParams(new URL(scriptTag.src).search).get('_bhpid');
  } catch (error) {
    window.beehiiv.log('Could not parse publication id in query string', 'error');
    return;
  }

  if (!window.beehiiv.publicationId) {
    window.beehiiv.log('No publication id found in query string', 'error');
    return;
  }
  
  function fetchRecommendations(publicationId) {
    return fetch('https://embeds.beehiiv.com/api/recommendations_widget?publication_id=' + publicationId);
  }

  function validateEmail(email) { 
    var emailInput = document.createElement('input')
    emailInput.setAttribute('type', 'email')
    emailInput.value = email;
    return emailInput.validity && emailInput.validity.valid === true;
  }

  function showRecommendations(email) {
    var reccomendationsContainer = document.createElement('div');
    reccomendationsContainer.setAttribute('id', 'beehiiv-'+window.beehiiv.publicationId+'-recommendations');
    reccomendationsContainer.classList.add('bhr_root');
    reccomendationsContainer.innerHTML = window.beehiiv.recommendationsHTML;
    
    var recommendationsForm = reccomendationsContainer.querySelector('form[name="beehiiv-recommendations-form"]');
    
    if (!recommendationsForm) {
      window.beehiiv.log('Could not find recommendations form', 'error');
    }

    var emailField = recommendationsForm.querySelector('form[name="beehiiv-recommendations-form"] > input[name="email"]');
    var userAgentField = recommendationsForm.querySelector('form[name="beehiiv-recommendations-form"] > input[name="user_agent"]');
    var closeButton = recommendationsForm.querySelector('.bhr_close_button');
    
    if (email && validateEmail(email)) {
      emailField.value = email;
    }
    userAgentField.value = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    /* --- Event Listeners and handlers --- */
    function closeRecommendations() {
      // Remove the widget in document
      document.body.removeChild(reccomendationsContainer);

      if (window.beehiiv.redirectUrl) {
        try {
          var validUrl = new URL(window.beehiiv.redirectUrl);
          window.parent.location.href = validUrl.href;
          return;
        } catch (error) {
          // report error
          log('Failed to parse redirect url after submitting recommendations', 'error');
        }
      }
    }

    function getAnalyticsData() {
      var params = (new URL(document.location)).searchParams;
      return {
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        referrer: encodeURIComponent(window.location.href),
      };
    }

    function saveAndCloseRecommendations() {
      try {
        var formData = new FormData(recommendationsForm);
        var recommendationIds = Array.from(recommendationsForm.querySelectorAll('input[name="recommendation_id"]:checked')).map(function(el) { return el.value; });
        var requestBody = Object.fromEntries(formData);

        if (recommendationIds.length === 0 || !requestBody.email) {
          closeRecommendations();
          log('No recommendations selected or email not provided, closing without submitting recommendations', 'info');
          return;
        }

        requestBody.recommendation_ids = recommendationIds;
        delete requestBody.recommendation_id;

        var requestUrl = recommendationsForm.getAttribute('action');
        fetch(requestUrl, {
          method: "POST",
          mode: "cors",
          cache: "no-cache",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          redirect: "follow",
          referrerPolicy: "no-referrer",
          body: JSON.stringify(Object.assign({}, requestBody, getAnalyticsData())),
        }).then(function(response) {
          closeRecommendations();
        }).catch(function(error) {
          window.beehiiv.log('Error saving recommendations', 'error');
          window.beehiiv.log(error, 'error');
          closeRecommendations();
        });
      } catch (error) {
        window.beehiiv.log('Error submitting recommendations', 'error');
        window.beehiiv.log(error, 'error');
        closeRecommendations();
      }
    }

    function showEmailModal() {
      var emailModal = document.querySelector('.bhr_email_modal');
      if (!emailModal) {
        log('Could not find email modal', 'error');
        return;
      }

      var form = emailModal.querySelector('form[name="beehiiv-recommendations-email-form"]');
      var cancelButton = form.querySelector('button[type="button"]');

      if (!form || !cancelButton) {
        log('Could not find form elements in email modal', 'error');
        return;
      }

      // Add event listener to email form
      form.addEventListener('submit', function(event) {
        event.preventDefault();

        var formData = new FormData(form);
        var confirmEmail = formData.get('confirm_email');

        if (!confirmEmail) {
          return false;
        }

        emailField.value = confirmEmail;

        saveAndCloseRecommendations();
      });
      
      // Close on cancel button click
      cancelButton.addEventListener('click', function(event) {
        emailModal.classList.add('hidden');
      });

      // Show the email modal
      emailModal.classList.remove('hidden');
    }

    function handleSubmit(event) {
      event.preventDefault();

      if (!emailField.value) {
        log('Email is required to submit recommendations', 'info')
        showEmailModal();
        return;
      }

      saveAndCloseRecommendations();
    }

    // Make form an AJAX form
    recommendationsForm.addEventListener('submit', handleSubmit);

    // Close button
    closeButton.addEventListener('click', closeRecommendations);

    /* --- Event Listeners and handlers --- */
    
    // Append the widget to the document
    document.body.appendChild(reccomendationsContainer);
  };

  function loadFonts(src) {
    for(var i=0; i<FONTS.length; i++) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONTS[i];
      document.head.appendChild(link);
    }
  }

  window.addEventListener('load', function() {
    fetchRecommendations(window.beehiiv.publicationId)
      .then(function(response) {
        if (response.ok) {
          loadFonts();
          window.beehiiv.recommendationsLoaded = true;
          return response.json()
        }
      })
      .then(function(response) {
        try {
          if (!response.show_widget) {
            log('No recommendations to show', 'info');
            return;
          }

          window.beehiiv.recommendationsHTML = response.form;
          window.beehiiv.showRecommendations = showRecommendations;
          window.beehiiv.redirectUrl = response.recommendation_widget.redirect_url || null;
          
          var triggerUrls = response.recommendation_widget.trigger_urls || null; // Automatic
          var shouldListenToSubscriberFormMessage = response.recommendation_widget.trigger_option === 'via_subscriber_forms'; // Via subscribe form
          var allowedEmbedIds = response.recommendation_widget.external_embed_ids || [];

          // Setup triggers for showing recommendations
          // in order of priority
          // Prio 1. if a trigger url is set, show widget when that url is visited (does not include SPA navigation)
          // Prio 2. if trigger option is set to 'via_subscriber_forms', listen to subscriber form submission
          if (triggerUrls && triggerUrls.length > 0) {
            var currentUrlWithoutSearchParams = window.location.href.replace(window.location.search, '');
            var currentUrlWithoutSlashes = currentUrlWithoutSearchParams.replaceAll('/', '');
            var triggerUrlsWithoutSlashes = triggerUrls.map(function (url) { return url.replaceAll('/', ''); });
            
            // Check if current url matches one of trigger urls with or without slashes and without search params
            if (
              triggerUrls.includes(currentUrlWithoutSearchParams) ||
              triggerUrlsWithoutSlashes.includes(currentUrlWithoutSlashes)
            ) {
              var searchParams = new URLSearchParams(window.location.search);
              var email = searchParams.get('email');
              window.beehiiv.showRecommendations(email);
            } else {
              window.beehiiv.log('Trigger urls ('+triggerUrlsWithoutSlashes.join(', ')+') do not match with the current url ('+currentUrlWithoutSlashes+')');
            }
          } else if (shouldListenToSubscriberFormMessage) {
            window.addEventListener('message', function(event) {
              if (
                event.origin === 'https://embeds.beehiiv.com' &&
                event.data &&
                event.data.type === 'BEEHIIV_SUBSCRIBER_FORM_SUBMITTED' &&
                (allowedEmbedIds.length === 0 || allowedEmbedIds.includes(event.data.externalEmbedId))
              ) {
                window.beehiiv.showRecommendations(event.data.email);
              }
            });
          }
        } catch(error) {
          window.beehiiv.log('Failed to parse response and show recommendations', 'error');
          window.beehiiv.log(error, 'error');
        }
      })
      .catch(function(error) {
        // todo: report error
        window.beehiiv.log('Failed to fetch recommendations', 'error');
        window.beehiiv.log(error, 'error');
      });
  });
})();
