import { useEffect, useState } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

async function getWeather(location) {
  try {
    // 1) Getting location (geocoding)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
    );
    const geoData = await geoRes.json();
    console.log(geoData);

    if (!geoData.results) throw new Error("Location not found");

    const { latitude, longitude, timezone, name, country_code } =
      geoData.results.at(0);
    console.log(`${name} ${convertToFlag(country_code)}`);

    // 2) Getting actual weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
    );
    const weatherData = await weatherRes.json();
    console.log(weatherData.daily);
  } catch (err) {
    console.err(err);
  }
}

export default function App() {
  const [location, setLocation] = useState("");
  const [IsLoading, setIsLoading] = useState(false);
  const [displayLocation, setDisplayLocation] = useLocalStorageState(
    "",
    "location"
  );
  const [weather, setWeather] = useLocalStorageState({}, "weather");

  useEffect(
    function () {
      async function getWeather(location) {
        try {
          setIsLoading(true);
          // 1) Getting location (geocoding)
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
          );
          const geoData = await geoRes.json();

          if (!geoData.results) throw new Error("Location not found");

          const { latitude, longitude, timezone, name, country_code } =
            geoData.results.at(0);
          setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

          // 2) Getting actual weather
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );
          const weatherData = await weatherRes.json();
          setWeather({
            weather: weatherData.daily,
          });
        } catch (err) {
          console.log(err);
        } finally {
          setIsLoading(false);
        }
      }
      if (location.length < 3) return;

      getWeather(location);
      setIsLoading(false);

      return function () {
        if (location.length < 2) {
          setWeather({});
          setLocation("");
          return;
        }
      };
    },
    [location, setDisplayLocation, setIsLoading, setWeather]
  );

  return (
    <div className="app">
      <h1>Weekly Weather</h1>
      <Input location={location} onSetLocation={setLocation}></Input>
      {IsLoading && <p className="loader">Loading...</p>}
      {weather.weather && (
        <Weather weather={weather} displayLocation={displayLocation} />
      )}
    </div>
  );
}

function Input({ location, onSetLocation }) {
  return (
    <div>
      <input
        type="text"
        placeholder="Search from location"
        value={location}
        onChange={(e) => onSetLocation(e.target.value)}
      />
    </div>
  );
}

function Weather({ weather, displayLocation }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather.weather;
  return (
    <div>
      <h2>Weather for {displayLocation}</h2>
      <ul className="weather">
        {dates.map((date, i) => (
          <Day
            key={date}
            date={date}
            max={max.at(i)}
            min={min.at(i)}
            code={codes.at(i)}
            isToday={i === 0}
          />
        ))}
      </ul>
    </div>
  );
}

function Day({ date, max, min, code, isToday }) {
  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
    </li>
  );
}
