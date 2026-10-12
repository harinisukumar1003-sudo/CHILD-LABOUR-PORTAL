package com.clrms.config;

import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import com.clrms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
@Profile("demo")
public class DemoAccountConfiguration {
    @Bean
    CommandLineRunner seedDemoAccounts(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${app.demo.password}") String demoPassword
    ) {
        return args -> List.of(
                new DemoAccount("demo.citizen@clrms.example", "Demo Citizen", UserRole.CITIZEN, null, null),
                new DemoAccount("demo.officer@clrms.example", "Demo Officer", UserRole.OFFICER, "Pune", "Child Protection Unit"),
                new DemoAccount("demo.ngo@clrms.example", "Demo NGO Worker", UserRole.NGO_STAFF, "Pune", "Child Care Foundation"),
                new DemoAccount("demo.admin@clrms.example", "Demo Administrator", UserRole.ADMIN, null, null)
        ).forEach(account -> {
            if (!users.existsByEmailIgnoreCase(account.email())) {
                User user = new User();
                user.setName(account.name());
                user.setEmail(account.email());
                user.setPasswordHash(passwordEncoder.encode(demoPassword));
                user.setRole(account.role());
                user.setStatus(UserStatus.ACTIVE);
                user.setDistrict(account.district());
                user.setOrganization(account.organization());
                users.save(user);
            }
        });
    }

    private record DemoAccount(String email, String name, UserRole role, String district, String organization) { }
}
