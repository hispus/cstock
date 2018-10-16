# README.md

By default, these crons will look for a `config.json` file in the current directory. It should be formatted like:
```
{
  "baseUrl": "https://kecstock.jsi.com",
  "authorization": "Basic BTOAUSERPASS"
}

```

If `config.json` does not exist, it will then look for a `DHIS2_HOME` environment variable and a configuration in `$DHIS2_HOME/config`. So for example if your `DHIS2_HOME` environment variable is set to `~/.dhis2`, the starter app will look for `~/.dhis2/config.js` and then `~/.dhis2/config.json` and load the first one it can find.

The config should export an object with the properties `baseUrl` and
`authorization`, where authorization is the base64 encoding of your username and
password. You can obtain this value by opening the console in your browser and
typing `btoa('user:pass')`.

If no config is found, the default `baseUrl` is `http://localhost:8080/dhis` and
the default username and password is `admin` and `district`, respectively.
