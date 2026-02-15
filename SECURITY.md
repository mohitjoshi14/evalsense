# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.4.x   | Yes       |
| < 0.4   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in evalsense, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, use one of these methods:

1. **GitHub Security Advisories** (preferred): Go to the [Security tab](https://github.com/evalsense/evalsense/security/advisories) and click "Report a vulnerability"
2. **Email**: Contact the maintainers directly (see package.json for contact info)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix and disclosure**: Coordinated with the reporter

## Security Considerations

evalsense evaluates LLM outputs and may process untrusted text. When using the library:

- **Never hardcode API keys** in eval files — use environment variables
- **Review LLM outputs** before using them in downstream systems
- **Use `.gitignore`** to exclude `.env` files from version control
- **Audit dependencies** regularly with `npm audit`
