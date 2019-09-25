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

    fetch(endpoint)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => console.table(data))
      .catch((err) => {
        if (err instanceof Error) {
          return console.error(err.message);
        }
        // error from fetching endpoint
        try {
          return err.json().then((data) => console.error(`${data.cod}: ${data.message}`));
        } catch (pErr) {
          return console.log(pErr);
        }
      });
  }

  function init() {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
          return;
        }

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
      { enableHighAccuracy: true }
    );
  }
  // init();
})();
