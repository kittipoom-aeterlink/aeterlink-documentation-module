"""Legacy deploy patch disabled.

V23 A4 overflow changes have been consolidated into source files. This script
remains as a no-op only because the current GitHub Actions workflow still calls it.
"""


def main():
    print('NO-OP: legacy V23 patch disabled; source files are already consolidated.')


if __name__ == '__main__':
    main()
