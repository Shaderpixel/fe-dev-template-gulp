(() => {
  function getWeather(coords) {
    const params = {
      coords,
      unit: 'imperial', // fahrenheit
      apiKey: 'b8edf510d33cf0f1380f025d7ceb0d1e', // should be stored on server
      type: 'accurate'
    };

    if (!params.coords) {
      return;
    }

    const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    const endpoint = `${baseUrl}?lat=${params.coords.latitude}&lon=${params.coords.longitude}&units=${params.unit}&type=${params.type}&APPID=${params.apiKey}`;

    const request = new XMLHttpRequest();
    request.open('GET', endpoint, true);

    request.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        // Success!
        const data = JSON.parse(this.response);
        console.table(data);
      } else {
        // We reached our target server, but it returned an error
      }
    };

    request.onerror = (err) => {
      // There was a connection error of some sort
      console.log(err);
    };

    request.send();
  }

  // get the user coordinates
  function init() {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const coords = {
          latitude,
          longitude
        };
        getWeather(coords);
      },
      (err) => {
        // eslint-disable-next-line no-alert
        alert(`${err.message}. Won't be able to deliver weather results`);
        return false;
      },
      {
        enableHighAccuracy: true
      }
    );
  }

  // init();
})();
