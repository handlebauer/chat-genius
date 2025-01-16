export const getStatusColor = (status?: string) => {
    switch (status) {
        case 'away':
            return 'text-yellow-500'
        case 'online':
            return 'text-green-500'
        default:
            return 'text-gray-500'
    }
}
