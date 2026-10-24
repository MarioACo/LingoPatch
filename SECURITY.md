# Security policy

Please do not open a public issue for a suspected vulnerability. Report it
privately through GitHub's security advisory feature after this repository is
published.

LingoPatch treats dictionaries as untrusted content. The runtime intentionally
does not inject translation values as HTML and limits translated attributes to
an allowlist. Reports involving a way to bypass these boundaries are especially
important.
