"""Legacy deploy patch disabled.

The production repository now keeps runtime fixes as normal source files.
This script remains as a no-op only because the existing GitHub Actions workflow
still calls it before clasp push.
"""


def main():
    print('NO-OP: legacy runtime patch disabled; source files are already patched.')


if __name__ == '__main__':
    main()
