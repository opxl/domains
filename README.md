# opxl/domains
Request a subdomain for yourself or your project.

# How to Request
Submit a PR with a file in `subdomains/<domain>/<subdomain>.json`. The format is as follows:
```json
{
    "type": "", // record type
    "value": "", // the value of the record (IP if A, domain if CNAME, etc.)
    "proxied": true // if the record should be proxied by Cloudflare
}
```
Once the PR is accepted, your domain will be automatically issued. We'll give you any help you need with your record, if any.

# Available Domains
- `should-get-to.work`