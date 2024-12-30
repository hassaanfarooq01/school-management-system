module.exports = {
    username: (data) => {
        if (data.trim().length < 3) {
            return false;
        }
        return true;
    },
    school: {
        createSchool: ({ name, address, adminId }) => {
            if (!name || name.trim().length < 3) {
                return 'School name must be at least 3 characters long';
            }
            if (!address || address.trim().length < 5) {
                return 'School address must be at least 5 characters long';
            }
            if (!adminId || adminId.trim().length < 3) {
                return 'Admin ID must be at least 3 characters long';
            }
            return null;
        },
    },
};
