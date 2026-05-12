"""Legacy deploy patch disabled.

Row-control fixes have been consolidated into production source files. This
script remains as a no-op only because the current GitHub Actions workflow still calls it.
"""


def main():
    print('NO-OP: legacy row-controls patch disabled; source files are already consolidated.')


if __name__ == '__main__':
    main()
